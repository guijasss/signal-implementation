import {
    SignalProtocolAddress,
    SessionBuilder,
    SessionCipher,
    KeyHelper,
    KeyPairType,
  } from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';
import axios from 'axios';
import { base64ToArrayBuffer } from '../src/parsers';
  
export class SignalService {
  store: SignalProtocolStore;

  constructor() {
    this.store = new SignalProtocolStore();
  }
  
  // Função auxiliar para converter string em ArrayBuffer
  private async stringToArrayBuffer(str: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;  // Converte string para ArrayBuffer
  }

  // Função auxiliar para converter ArrayBuffer em string
  private arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  registerUser(identityKeyPair: KeyPairType<ArrayBuffer>, registrationId: number): void {
    this.store.put('identityKey', {
      pubKey: identityKeyPair.pubKey,
      privKey: identityKeyPair.privKey,
    });
    this.store.put('registrationId', registrationId);
  }
  
  async generatePreKeys(startId: number, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const preKey = await KeyHelper.generatePreKey(startId + i);
      await this.store.storePreKey(preKey.keyId, preKey.keyPair);
    }
  }

  async generateSignedPreKey(identityKeyPair: KeyPairType<ArrayBuffer>): Promise<void> {
    const identityKey: KeyPairType<ArrayBuffer> = {
      pubKey: identityKeyPair.pubKey,
      privKey: identityKeyPair.privKey,
    };

    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKey, Date.now());
    await this.store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);
  }

  async setupSession(theirRegistrationId: string, preKeyBundle: any): Promise<void> {
    const address = new SignalProtocolAddress(theirRegistrationId, 1);
    const sessionBuilder = new SessionBuilder(this.store, address);

    const processedPreKeyBundle = {
      identityKey: preKeyBundle.identityKey,
      signedPreKey: {
        keyId: preKeyBundle.signedPreKey.keyId,
        publicKey: preKeyBundle.signedPreKey.publicKey,
        signature: preKeyBundle.signedPreKey.signature,
      },
      preKey: {
        keyId: preKeyBundle.preKey.keyId,
        publicKey: preKeyBundle.preKey.publicKey,
      },
    };

    await sessionBuilder.processPreKey(processedPreKeyBundle);
  }

  async sendMessage(recipientAddress: string, message: string): Promise<void> {
    const address = new SignalProtocolAddress(recipientAddress, 1);
    const sessionCipher = new SessionCipher(this.store, address);

    // Converte a mensagem em ArrayBuffer antes de enviar
    const messageBuffer = await this.stringToArrayBuffer(message);

    const ciphertext = await sessionCipher.encrypt(messageBuffer);  // Encriptar a mensagem
    console.log('Ciphertext:', ciphertext);

    // Aqui, você pode enviar o `ciphertext` para o destinatário por meio da rede
    // (exemplo fictício de envio pela rede)
    this.sendToNetwork(recipientAddress, ciphertext);
  }

  // Implementação de envio para o servidor usando HTTP com axios
  private async sendToNetwork(recipientAddress: string, ciphertext: any): Promise<void> {
    const serverUrl = 'https://seu-servidor.com/api/sendMessage';  // Substitua pelo URL do seu servidor

    try {
      const response = await axios.post(serverUrl, {
        recipient: recipientAddress,
        message: ciphertext
      });
      console.log('Mensagem enviada com sucesso:', response.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }

  async receiveMessage(senderAddress: string, ciphertext: any): Promise<string> {
    const address = new SignalProtocolAddress(senderAddress, 1);
    const sessionCipher = new SessionCipher(this.store, address);

    // Descriptografar a mensagem recebida
    const plaintextBuffer = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
    
    // Converte o ArrayBuffer de volta para string
    const plaintext = this.arrayBufferToString(plaintextBuffer);
    console.log('Mensagem recebida:', plaintext);
    return plaintext;
  }
}