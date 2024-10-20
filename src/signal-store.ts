import {
  StorageType,
  Direction,
  SessionRecordType,
  PreKeyPairType,
  SignedPreKeyPairType,
} from '@privacyresearch/libsignal-protocol-typescript';

// Definições de tipos

interface KeyPairType {
  pubKey: ArrayBuffer;
  privKey: ArrayBuffer;
}

interface PreKeyType {
  keyId: number;
  keyPair: KeyPairType;
}

interface SignedPreKeyType extends PreKeyType {
  signature: ArrayBuffer;
}

type StoreValue =
  | KeyPairType
  | string
  | number
  | PreKeyType
  | SignedPreKeyType
  | ArrayBuffer
  | undefined;

export class SignalProtocolStore implements StorageType {
  private _store: Record<string, StoreValue>;

  constructor() {
    this._store = {};
  }
  isTrustedIdentity: (identifier: string, identityKey: ArrayBuffer, direction: Direction) => Promise<boolean>;

  saveIdentity(encodedAddress: string, publicKey: ArrayBuffer, nonblockingApproval?: boolean): Promise<boolean> {
    this.put('identityKey' + encodedAddress, publicKey);
    return Promise.resolve(true);
  }

  async loadPreKey(encodedAddress: string | number): Promise<KeyPairType> {
    const preKey = this.get('25519KeypreKey' + encodedAddress);
    if (!isPreKeyType(preKey)) {
      throw new Error('Stored preKey is not of the expected type');
    }
    return preKey.keyPair;
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put('25519KeypreKey', { keyId: Number(keyId), keyPair });
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.put('25519KeysignedKey' + keyId, keyPair);
  }

  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    this.put('session' + encodedAddress, record);
  }

  async listSessions(): Promise<Record<string, StoreValue>> {
    return this._store
  }

  get(key: string, defaultValue?: StoreValue): StoreValue {
    if (key === null || key === undefined) throw new Error('Tried to get value for undefined/null key');
    return key in this._store ? this._store[key] : defaultValue;
  }

  remove(key: string): void {
    if (key === null || key === undefined) throw new Error('Tried to remove value for undefined/null key');
    delete this._store[key];
  }

  put(key: string, value: StoreValue): void {
    if (key === undefined || value === undefined || key === null || value === null)
      throw new Error('Tried to store undefined/null');
    this._store[key] = value;
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const kp = this.get('identityKey', undefined);
    if (isKeyPairType(kp) || typeof kp === 'undefined') {
      return kp;
    }
    throw new Error('Item stored as identity key of unknown type.');
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const rid = this.get('registrationId', undefined);
    if (typeof rid === 'number' || typeof rid === 'undefined') {
      return rid;
    }
    throw new Error('Stored Registration ID is not a number');
  }

  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    const rec = this.get(identifier, undefined);
    if (typeof rec === 'string') {
      return rec as SessionRecordType;
    } else if (typeof rec === 'undefined') {
      return rec;
    }
    throw new Error(`Session record is not a string`);
  }

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    const res = this.get('25519KeysignedKey' + keyId, undefined);
    if (isKeyPairType(res)) {
      return { pubKey: res.pubKey, privKey: res.privKey };
    } else if (typeof res === 'undefined') {
      return res;
    }
    throw new Error(`Stored key has wrong type`);
  }

  async removePreKey(keyId: number | string): Promise<void> {
    this.remove('25519KeypreKey' + keyId);
  }

  async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
    if (identifier === null || identifier === undefined) {
      throw new Error('Tried to get identity key for undefined/null key');
    }

    const key = this.get('identityKey' + identifier, undefined);
    if (isArrayBuffer(key)) {
      return key as ArrayBuffer;
    } else if (typeof key === 'undefined') {
      return key;
    }
    throw new Error(`Identity key has wrong type`);
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    return this.remove('25519KeysignedKey' + keyId);
  }

  async removeSession(identifier: string): Promise<void> {
    return this.remove('session' + identifier);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    for (const id in this._store) {
      if (id.startsWith('session' + identifier)) {
        delete this._store[id];
      }
    }
  }
}

// Funções utilitárias
export function arrayBufferToString(b: ArrayBuffer): string {
  return uint8ArrayToString(new Uint8Array(b));
}

export function uint8ArrayToString(arr: Uint8Array): string {
  const end = arr.length;
  let begin = 0;
  if (begin === end) return '';
  let chars: number[] = [];
  const parts: string[] = [];
  while (begin < end) {
    chars.push(arr[begin++]);
    if (chars.length >= 1024) {
      parts.push(String.fromCharCode(...chars));
      chars = [];
    }
  }
  return parts.join('') + String.fromCharCode(...chars);
}

// Type guards
export function isKeyPairType(kp: any): kp is KeyPairType {
  return !!(kp?.privKey && kp?.pubKey);
}

export function isPreKeyType(pk: any): pk is PreKeyType {
  return typeof pk?.keyId === 'number' && isKeyPairType(pk?.keyPair);
}

export function isSignedPreKeyType(spk: any): spk is SignedPreKeyType {
  return spk?.signature && isPreKeyType(spk);
}

function isArrayBuffer(thing: StoreValue): boolean {
  const t = typeof thing;
  return !!thing && t !== 'string' && t !== 'number' && 'byteLength' in (thing as any);
}
