import {
    SignalProtocolAddress,
    SessionBuilder,
    SessionCipher,
    KeyHelper,
    KeyPairType,
    PreKeyPairType
  } from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';
import axios from 'axios';

interface Message {
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
}

interface SessionRecordType {
  identifier: string; 
  sessionKey: ArrayBuffer;
  state: 'active' | 'inactive';
}
  
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
  
  async generatePreKeys(startId: number, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const preKey = await KeyHelper.generatePreKey(startId + i);
      await this.store.storePreKey(preKey.keyId, preKey.keyPair);
    }
  }

  async createSession(sessionId: string, store: SignalProtocolStore): Promise<void> {
    const senderKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair() 
    const recipientKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair(); 

    const senderSessionRecord: SessionRecordType = {
        identifier: sessionId, // O ID do destinatário
        sessionKey: senderKeyPair.pubKey, // Chave pública do remetente
        state: 'active', // Estado da sessão
    };

    const recipientSessionRecord: SessionRecordType = {
        identifier: sessionId, // O ID do destinatário
        sessionKey: recipientKeyPair.pubKey, // Chave pública do destinatário
        state: 'active', // Estado da sessão
    };

    await store.storeSession(sessionId, JSON.stringify(senderSessionRecord)); // Armazena o registro de sessão no store
    await store.storePreKey(1, senderKeyPair); // Armazenar a chave prévia do remetente
    await store.storeSignedPreKey(1, senderKeyPair); // Armazenar a chave assinada do remetente

    await store.storeSession(sessionId, JSON.stringify(recipientSessionRecord)); // Armazena o registro de sessão do destinatário
    await store.storePreKey(2, recipientKeyPair); // Armazenar a chave prévia do destinatário
    await store.storeSignedPreKey(2, recipientKeyPair); // Armazenar a chave assinada do destinatário
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

    const sessionKey = `session${theirRegistrationId}.1`;; 
    const sessionRecord = address.toString(); // Obter o registro da sessão após o processamento

    // Armazenar a sessão
    if (sessionRecord) {
        this.store.storeSession(sessionKey, sessionRecord); // Salvar a sessão no armazenamento
    } else {
        throw new Error('Failed to retrieve session record after processing prekey bundle');
    }
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    messageContent: string,
    store: SignalProtocolStore
  ): Promise<void> {
    const sessionId: string = "session".concat(senderId, recipientId)

    const sessionRecord = await store.loadSession(sessionId);
    if (!sessionRecord) {
      throw new Error(`No session found for ${recipientId}`);
    }

    // 2. Criptografar a mensagem
    const encryptedMessage = await this.encryptMessage(messageContent);

    // 3. Enviar a mensagem
    await this.sendToRecipient(recipientId, encryptedMessage, senderId);
  }

  async decryptMessage(encryptedMessage: ArrayBuffer): Promise<string> {
    // Simulação de descriptografia: converte de volta para string
    return new TextDecoder().decode(encryptedMessage);
  }

  async encryptMessage(content: string): Promise<ArrayBuffer> {
    // Aqui você deve implementar a lógica de criptografia usando a biblioteca Signal
    const encoder = new TextEncoder();
    // Simulação de criptografia: converte para ArrayBuffer
    return encoder.encode(content).buffer; 
  }

  // Função para simular o envio da mensagem
  async sendToRecipient(recipientId: string, message: ArrayBuffer, senderId: string): Promise<void> {
    // Aqui você deve implementar a lógica de envio (ex: WebSocket ou HTTP)
    console.log(`Mensagem enviada de ${senderId} para ${recipientId}:`, new TextDecoder().decode(message));
  }
}