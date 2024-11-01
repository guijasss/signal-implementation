import {
  SignalProtocolAddress,
  SessionCipher,
  KeyHelper,
  KeyPairType,
  MessageType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './signal-store';

interface SessionRecordType {
  identifier: string; 
  sessionKey: ArrayBuffer; // Armazenamos apenas a chave pública aqui
  state: 'active' | 'inactive';
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

  async createSession(senderId: string, recipientId: string): Promise<void> {
      const existingSessionIdentifier = `session.${senderId}-${recipientId}`;
      
      // Verifique se a sessão já existe
      const existingSession = await this.store.loadSession(existingSessionIdentifier);
      if (existingSession) {
          console.log(`Session already exists for ${senderId} and ${recipientId}.`);
          return; // Não cria uma nova sessão se já existir
      }

      // Gera e armazena as chaves do remetente
      const senderKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair();
      await this.store.saveIdentity(senderId, senderKeyPair.pubKey);
      
      const senderPreKey = await KeyHelper.generatePreKey(1);
      await this.store.storePreKey(senderPreKey.keyId, senderPreKey.keyPair);
      const signedPreKey = await KeyHelper.generateSignedPreKey(senderKeyPair, 1);
      await this.store.storeSignedPreKey(signedPreKey.keyId, senderPreKey.keyPair);

      // Gera e armazena as chaves do destinatário
      const recipientKeyPair: KeyPairType = await KeyHelper.generateIdentityKeyPair();
      await this.store.saveIdentity(recipientId, recipientKeyPair.pubKey);
      
      const recipientPreKey = await KeyHelper.generatePreKey(2);
      await this.store.storePreKey(recipientPreKey.keyId, recipientPreKey.keyPair);
      
      // Armazenar a chave assinada como KeyPairType
      const signedKeyPair: KeyPairType = {
          pubKey: senderKeyPair.pubKey,
          privKey: senderKeyPair.privKey,
      };
      
      await this.store.storeSignedPreKey(1, signedKeyPair);
      
      // Cria uma nova sessão
      const sessionRecord: SessionRecordType = {
          identifier: existingSessionIdentifier, // Usar um identificador único para o par
          sessionKey: senderKeyPair.pubKey, // Ou você pode escolher a chave do destinatário
          state: 'active',
      };
      await this.store.storeSession(sessionRecord.identifier, JSON.stringify(sessionRecord));

      // Verifique as sessões ativas
      console.log(this.store);
  }

  async sendMessage(senderId: string, recipientId: string, messageContent: string): Promise<string> {
      const sessionId: string = `session.${senderId}-${recipientId}`;
      
      // Carrega a sessão
      const sessionRecordString = await this.store.loadSession(sessionId);
      if (!sessionRecordString) {
          throw new Error(`No session found for ${senderId}`);
      }

      const senderAddress = new SignalProtocolAddress(senderId, 1); // Substitua 1 pelo ID da chave se necessário
      const sessionCipher = new SessionCipher(this.store, senderAddress);

      // Criptografa a mensagem
      return this.encryptMessage(sessionCipher, messageContent);
  }

  encryptMessage(sessionCipher: SessionCipher, content: string): string {
      return content
  }

  async getAllIdentities(): Promise<string[]> {
      const identities = await this.store.getAllIdentities();
      return identities;
  }
}
