import {
    SignalProtocolAddress,
    SessionBuilder,
    SessionCipher,
    KeyHelper,
    KeyPairType,
    PreKeyPairType,
    MessageType
  } from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';
import axios from 'axios';
import { util } from 'protobufjs';

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
  
  async generatePreKeys(startId: number, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const preKey = await KeyHelper.generatePreKey(startId + i);
      await this.store.storePreKey(preKey.keyId, preKey.keyPair);
    }
  }

  async isSessionEstablished(
    senderId: string,
    recipientId: string,
    store: SignalProtocolStore
  ): Promise<boolean> {
    const sessionId = `${senderId}.${recipientId}`;
    const session = await store.loadSession(sessionId);
    
    return session !== undefined;
  }

  async createSession(senderId: string, recipientId: string, store: SignalProtocolStore): Promise<void> {
    const existingSessionIdentifier = `session.${senderId}-${recipientId}`;
    
    // Verifique se a sessão já existe
    const existingSession = await store.loadSession(existingSessionIdentifier);
    if (existingSession) {
      console.log(`Session already exists for ${senderId} and ${recipientId}.`);
      return; // Não cria uma nova sessão se já existir
    }
  
    // Gera e armazena as chaves do remetente
    const senderKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair();
    await store.saveIdentity(senderId, senderKeyPair.pubKey);
    
    const senderPreKey = await KeyHelper.generatePreKey(1);
    await store.storePreKey(senderPreKey.keyId, senderPreKey.keyPair);
    await store.storeSignedPreKey(1, senderKeyPair);
  
    // Gera e armazena as chaves do destinatário
    const recipientKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair();
    await store.saveIdentity(recipientId, recipientKeyPair.pubKey);
    
    const recipientPreKey = await KeyHelper.generatePreKey(2);
    await store.storePreKey(recipientPreKey.keyId, recipientPreKey.keyPair);
    await store.storeSignedPreKey(2, recipientKeyPair);
    
    // Cria uma nova sessão
    const sessionRecord: SessionRecordType = {
      identifier: existingSessionIdentifier, // Usar um identificador único para o par
      sessionKey: senderKeyPair.pubKey, // Ou você pode escolher o chave do destinatário
      state: 'active',
    };
    await store.storeSession(sessionRecord.identifier, JSON.stringify(sessionRecord));
  
    // Verifique as sessões ativas
    console.log(await store.listActiveSessions());
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    messageContent: string,
    store: SignalProtocolStore
  ): Promise<void> {
    const sessionId: string = senderId.concat(".123");
  
    // Carrega a sessão
    const sessionRecord = await store.loadSession(sessionId);
    if (!sessionRecord) {
      console.log(await store.listActiveSessions());

      throw new Error(`No session found for ${senderId}`);
    }
    
    const senderAddress = new SignalProtocolAddress(senderId, 123);
    const sessionCipher = new SessionCipher(store, senderAddress);

    // Criptografa a mensagem
    const encryptedMessage = await this.encryptMessage(sessionCipher, messageContent);
  
    // Enviar a mensagem
    // await this.sendToRecipient(recipientId, encryptedMessage, senderId);
  }

  async encryptMessage(sessionCipher: SessionCipher, content: string): Promise<MessageType> {
    try {
        const encoder = new TextEncoder();
        const messageBuffer: ArrayBuffer = encoder.encode(content).buffer;
   
        const cipher = await sessionCipher.encrypt(messageBuffer);

        return cipher;
    } catch (error) {
        console.error("Error during encryption", error);
        throw error; // Lança o erro para tratamento adicional, se necessário
    }
}

  // Função para simular o envio da mensagem
  async sendToRecipient(recipientId: string, message: MessageType, senderId: string): Promise<void> {
    // Aqui você deve implementar a lógica de envio (ex: WebSocket ou HTTP)
    console.log(`Mensagem enviada de ${senderId} para ${recipientId}:`);
  }
}