import {
  StorageType,
  Direction,
  SessionRecordType,
  PreKeyPairType,
  SignedPreKeyPairType,
  SignalProtocolAddress,
} from '@privacyresearch/libsignal-protocol-typescript';

// Definições de tipos auxiliares
interface KeyPairType {
  pubKey: ArrayBuffer;
  privKey: ArrayBuffer;
}

type StoreValue =
  | KeyPairType
  | string
  | number
  | PreKeyPairType
  | SignedPreKeyPairType
  | ArrayBuffer
  | undefined;

export class SignalProtocolStore implements StorageType {
  private _store: Record<string, StoreValue>;

  constructor() {
    this._store = {};
  }

  // Implementação dos métodos obrigatórios
  async removePreKey(keyId: string | number): Promise<void> {
    this.remove('25519KeypreKey' + keyId);
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    this.remove('25519KeysignedKey' + keyId);
  }

  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const preKey = this.get('25519KeypreKey' + keyId) as PreKeyPairType;
    if (preKey) {
      return preKey.keyPair;
    }
    return undefined;
  }

  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: Direction): Promise<boolean> {
    const storedIdentity = this.get('identityKey' + identifier);
    return storedIdentity && storedIdentity instanceof ArrayBuffer
      ? storedIdentity.toString() === identityKey.toString()
      : true;
  }

  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer): Promise<boolean> {
    this.put('identityKey' + encodedAddress, publicKey);
    return Promise.resolve(true);
  }

  async getAllIdentities(): Promise<string[]> {
    const identities: string[] = [];
  
    for (const key in this._store) {
        if (key.startsWith('identityKey')) {
            identities.push(key.replace('identityKey', '')); // Extrai o identificador
        }
    }
  
    return identities;
}

  async loadSignedPreKey(keyId: number): Promise<KeyPairType | undefined> {
    return this.get('25519KeysignedKey' + keyId) as KeyPairType;
  }

  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    return this.get(identifier) as string
  }

  async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
    this.put(identifier, record); // Armazena diretamente o objeto SessionRecordType
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    return this.get('identityKeyPair') as KeyPairType;
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.get('registrationId') as number;
  }

  async removeSession(identifier: string): Promise<void> {
    this.remove(identifier);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    for (const key in this._store) {
      if (key.startsWith(identifier)) {
        this.remove(key);
      }
    }
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put('25519KeypreKey' + keyId, { keyId: Number(keyId), keyPair });
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put('25519KeysignedKey' + keyId, keyPair);
  }

  async listActiveSessions(): Promise<string[]> {
    const activeSessions: string[] = [];
  
    for (const key in this._store) {
      if (key.startsWith('session')) {
        activeSessions.push(key);
      }
    }
  
    return activeSessions;
  }  

  // Métodos auxiliares
  get(key: string): StoreValue {
    return this._store[key];
  }

  put(key: string, value: StoreValue): void {
    this._store[key] = value;
  }

  remove(key: string): void {
    delete this._store[key];
  }
}
