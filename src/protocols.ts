import { SignalService } from './signal-service'

export interface User {
  service: SignalService;
  ws?: WebSocket;
}

export interface SessionRecordType {
  identifier: string; 
  sessionKey: string; // Armazenamos apenas a chave pública aqui
  state: 'active' | 'inactive';
}

export interface PreKey {
  keyId: number;
  publicKey: ArrayBuffer; // ou `Uint8Array`
}

export interface SignedPreKey {
  keyId: number;
  publicKey: ArrayBuffer; // ou `Uint8Array`
}

export interface IdentityKeyBundle {
  identityKey: ArrayBuffer; // ou `Uint8Array`
  signedPreKey: SignedPreKey;
  preKeys: PreKey[];
}