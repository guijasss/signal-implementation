import {
  SignalProtocolAddress,
  SessionCipher,
  KeyHelper,
  KeyPairType,
  MessageType,
  SignedPublicPreKeyType,
  PreKeyType,
  SessionBuilder,
} from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';
import { IdentityKeyBundle } from 'protocols';
import { arrayBufferToBase64 } from './helpers';
import { SignalDirectory } from './signal-directory';

interface IdentityKeyBundleResponse {
  identityKey: string,
  signedPreKey: {
    keyId: number,
    publicKey: string
  },
  preKeys: { publicKey: string; keyId: number; }[]
}

export class SignalService {
  private store: SignalProtocolStore;
  private directory: SignalDirectory

  constructor(store: SignalProtocolStore, directory: SignalDirectory) {
    this.store = store;
    this.directory = directory;
  }

  async generatePreKeys(startId: number, count: number): Promise<void> {
      for (let i = 0; i < count; i++) {
          const preKey = await KeyHelper.generatePreKey(startId + i);
          await this.store.storePreKey(preKey.keyId, preKey.keyPair);
      }
  }

  async isSessionEstablished(senderId: string, recipientId: string): Promise<boolean> {
    const sessionId = `session.${senderId}-${recipientId}`;
    const session = await this.store.loadSession(sessionId);
    
    return session !== undefined;
  }

  async generateAndStoreKeys(userId: string): Promise<IdentityKeyBundle> {
    const keyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair();
    await this.store.saveIdentity(userId, keyPair.pubKey);

    const preKey = await KeyHelper.generatePreKey(1);
    await this.store.storePreKey(preKey.keyId, preKey.keyPair);

    const signedPreKey = await KeyHelper.generateSignedPreKey(keyPair, 1);
    await this.store.storeSignedPreKey(signedPreKey.keyId, keyPair);

    return {
      identityKey: keyPair.pubKey,
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.keyPair.pubKey
      },
      preKeys: [
        {
          keyId: preKey.keyId,
          publicKey: preKey.keyPair.pubKey
        }
      ]
    }
  }

  async register(username: string): Promise<IdentityKeyBundleResponse> {
    const registrationId: number = KeyHelper.generateRegistrationId();
    this.store.put('registrationId', registrationId);

    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    this.store.put('identityKey', identityKeyPair)

    const baseKeyId = Math.floor(10000 * Math.random());
    const preKey = await KeyHelper.generatePreKey(baseKeyId);
    this.store.storePreKey(`${baseKeyId}`, preKey.keyPair);

    const signedPreKeyId = Math.floor(10000 * Math.random());
    const signedPreKey = await KeyHelper.generateSignedPreKey(
      identityKeyPair,
      signedPreKeyId
    );
    this.store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
  
    const publicSignedPreKey: SignedPublicPreKeyType = {
      keyId: signedPreKeyId,
      publicKey: signedPreKey.keyPair.pubKey,
      signature: signedPreKey.signature,
    };
    
    const publicPreKey: PreKeyType = {
      keyId: preKey.keyId,
      publicKey: preKey.keyPair.pubKey,
    };
    
    this.directory.storeKeyBundle(username, {
      registrationId,
      identityPubKey: identityKeyPair.pubKey,
      signedPreKey: publicSignedPreKey,
      oneTimePreKeys: [publicPreKey],
    });

    return {
      identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey)
      },
      preKeys: [
        {
          keyId: preKey.keyId,
          publicKey: arrayBufferToBase64(preKey.keyPair.pubKey)
        }
      ]
    }
  };

  async setupSession(recipient: string): Promise<void> {
    const recipientBundle = this.directory.getPreKeyBundle(recipient)
    const recipientAddress = new SignalProtocolAddress(recipient, 1)
    const sessionBuilder = new SessionBuilder(this.store, recipientAddress)

    await sessionBuilder.processPreKey(recipientBundle!)

    const starterMessageBytes = Uint8Array.from([
      0xce,
      0x93,
      0xce,
      0xb5,
      0xce,
      0xb9,
      0xce,
      0xac,
      0x20,
      0xcf,
      0x83,
      0xce,
      0xbf,
      0xcf,
      0x85,
    ]);

    const senderSessionCipher = new SessionCipher(this.store, recipientAddress)
    const cipherText = await senderSessionCipher.encrypt(starterMessageBytes.buffer)

    console.log(cipherText.body);
  }

  async encryptMessage(recipientId: string, messageContent: string): Promise<MessageType> {
    const recipientAddress = new SignalProtocolAddress(recipientId, 1)
    const senderSessionCipher = new SessionCipher(this.store, recipientAddress)
    const cipherText = await senderSessionCipher.encrypt(new TextEncoder().encode(messageContent).buffer)
    return cipherText
  }

  async decryptMessage(recipientId: string, message: MessageType): Promise<string> {
    const recipientAddress = new SignalProtocolAddress(recipientId, 1)
    const cipher = new SessionCipher(this.store, recipientAddress)
    let plaintext: ArrayBuffer = new Uint8Array().buffer;

    if (message.type === 3) {
      plaintext = await cipher.decryptPreKeyWhisperMessage(message.body!, "binary");
    }
    else if (message.type === 1) {
      plaintext = await cipher.decryptWhisperMessage(message.body!, "binary");
    }

    const stringPlaintext = new TextDecoder().decode(new Uint8Array(plaintext));

    return stringPlaintext
  }
}
