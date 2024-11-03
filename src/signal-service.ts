import {
  SignalProtocolAddress,
  SessionCipher,
  KeyHelper,
  KeyPairType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';
import { IdentityKeyBundle, SessionRecordType } from 'protocols';
import { arrayBufferToBase64 } from './helpers';


interface IdentityKeyBundleResponse {
  identityKey: string,
  signedPreKey: string,
  preKeys: string
}


export class SignalService {
  store: SignalProtocolStore;

  constructor(store: SignalProtocolStore) {
      this.store = store;
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
  
  async registerUser(userId: string): Promise<any> {
    const bundle = await this.generateAndStoreKeys(userId);

    console.log(`Usuário registrado e chaves geradas para ${userId}`);

    return {
        identityKey: arrayBufferToBase64(bundle.identityKey),
        signedPreKey: {
          keyId: bundle.signedPreKey.keyId,
          publicKey: arrayBufferToBase64(bundle.signedPreKey.publicKey)
        },
        preKeys: bundle.preKeys.map(field => {
          return { ...field, publicKey: arrayBufferToBase64(field.publicKey) };
      })
    };
  }
 
  async createSession(senderId: string, recipientId: string): Promise<void> {
    const existingSessionIdentifier = `${senderId}-${recipientId}`;
    const existingSession = await this.store.loadSession(existingSessionIdentifier);

    if (existingSession) {
        console.log(`Session already exists for ${senderId} and ${recipientId}.`);
        return;
    }

    const senderKeys = await this.store.loadIdentity(senderId);
    if (!senderKeys) {
        throw new Error(`Identity key not found for sender: ${senderId}`);
    }
    
    const sessionRecord: SessionRecordType = {
      identifier: existingSessionIdentifier,
      sessionKey: senderKeys.toString(),
      state: 'active',
    };
    
    await this.store.storeSession(sessionRecord.identifier, JSON.stringify(sessionRecord));

    console.log(await this.store.loadSession(existingSessionIdentifier));
    console.log(this.store);
  }

  async sendMessage(senderId: string, recipientId: string, messageContent: string): Promise<string> {
    // Carrega a sessão
    const sessionId: string = `${senderId}-${recipientId}`;
    
    // Verifica se a sessão já existe
    const sessionRecord = await this.store.loadSession(sessionId);
    if (!sessionRecord) {
        // Se não existe, crie uma nova sessão
        await this.createSession(senderId, recipientId);
    }

    // Carregue a sessão novamente após a criação
    const newSessionRecord = await this.store.loadSession(sessionId);
    if (!newSessionRecord) {
        throw new Error(`No session found for ${senderId}`);
    }

    // Criptografa a mensagem
    return this.encryptMessage(senderId, messageContent);
  }

  async encryptMessage(recipientId: string, content: string): Promise<string> {
    // Converte a string de conteúdo para um ArrayBuffer
    const encoder = new TextEncoder();
    const contentBuffer = encoder.encode(content);

    // Criando um SignalProtocolAddress para o destinatário
    const address = new SignalProtocolAddress(recipientId, 1);

    // Instanciando o SessionCipher para o destinatário
    const sessionCipher = new SessionCipher(this.store, address);

    // Usa o método `encrypt` da classe `SessionCipher` para criptografar a mensagem
    const encryptedMessage = await sessionCipher.encrypt(contentBuffer.buffer); // Aqui, usamos `contentBuffer.buffer`

    // Retorna o conteúdo criptografado como ArrayBuffer
    return encryptedMessage.body; // O `body` contém a mensagem criptografada
  }


  async getAllIdentities(): Promise<string[]> {
      const identities = await this.store.getAllIdentities();
      return identities;
  }
}
