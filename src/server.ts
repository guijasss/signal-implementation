import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';

// Classe para armazenamento implementando a interface StorageType
class SignalStorage implements libsignal.StorageType {
  store: Map<string, any>;

  constructor() {
    this.store = new Map();
  }

  async getIdentityKeyPair() {
    return this.store.get('identityKey');
  }

  async getLocalRegistrationId() {
    return this.store.get('registrationId');
  }

  async isTrustedIdentity(identityKey: string, _identifier: any) {
    const storedIdentity = this.store.get(`identityKey:${identityKey}`);
    return storedIdentity === undefined || storedIdentity === identityKey;
  }

  async saveIdentity(identityKey: string, _identifier: any): Promise<boolean> {
    this.store.set(`identityKey:${identityKey}`, identityKey);
    return true;
  }

  async loadPreKey(keyId: string | number) {
    return this.store.get(`preKey:${keyId}`);
  }

  async storePreKey(keyId: string | number, keyPair: any): Promise<void> {
    this.store.set(`preKey:${keyId}`, keyPair);
  }

  async removePreKey(keyId: string | number): Promise<void> {
    this.store.delete(`preKey:${keyId}`);
  }

  async loadSignedPreKey(keyId: string | number) {
    return this.store.get(`signedPreKey:${keyId}`);
  }

  async storeSignedPreKey(keyId: string | number, keyPair: any): Promise<void> {
    this.store.set(`signedPreKey:${keyId}`, keyPair);
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    this.store.delete(`signedPreKey:${keyId}`);
  }

  async loadSession(encodedAddress: string): Promise<any> {
    return this.store.get(`session:${encodedAddress}`);
  }

  async storeSession(address: libsignal.SignalProtocolAddress, record: any): Promise<void> {
    this.store.set(`session:${address.toString()}`, record);
  }

  async loadSenderKey(_senderKeyId: any, _deviceId: any) {
    return null;
  }

  async storeSenderKey(_senderKeyId: any, _deviceId: any, _record: any): Promise<void> {
    // Implementação futura, caso necessário
  }
}

// Gerar identidades para usuários
async function generateIdentity(storage: SignalStorage) {
  const identityKeyPair = await libsignal.KeyHelper.generateIdentityKeyPair();
  const registrationId = await libsignal.KeyHelper.generateRegistrationId();

  await storage.saveIdentity(identityKeyPair.pubKey, registrationId.toString()); // Convertendo registrationId para string

  return { identityKeyPair, registrationId };
}

// Gerar o par de chaves de sessão
async function generatePreKeyBundle(storage: SignalStorage, registrationId: number, identityKeyPair: libsignal.KeyPair) {
  const signedPreKey = await libsignal.KeyHelper.generateSignedPreKey(identityKeyPair, 1);
  const preKey = await libsignal.KeyHelper.generatePreKey(1);

  const preKeyBundle = {
    registrationId: registrationId,
    identityKey: identityKeyPair.pubKey,
    signedPreKey: signedPreKey.keyPair.pubKey,
    signedPreKeySignature: signedPreKey.signature,
    preKey: preKey.keyPair.pubKey
  };

  await storage.storePreKey(preKey.keyId, preKey.keyPair);
  await storage.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  return preKeyBundle;
}

// Inicializar o protocolo de sessão entre dois usuários
async function initSession(sender: libsignal.SignalProtocolAddress, receiver: libsignal.SignalProtocolAddress, senderStore: SignalStorage, receiverStore: SignalStorage, receiverPreKeyBundle: any) {
  const sessionBuilder = new libsignal.SessionBuilder(senderStore, receiver);
  await sessionBuilder.processPreKey(receiverPreKeyBundle);
}

// Enviar mensagem criptografada
async function sendMessage(sender: libsignal.SignalProtocolAddress, receiver: libsignal.SignalProtocolAddress, senderStore: SignalStorage, message: string) {
  const sessionCipher = new libsignal.SessionCipher(senderStore, receiver);
  const ciphertext = await sessionCipher.encrypt(new TextEncoder().encode(message)); // Convertendo string para Uint8Array
  return ciphertext;
}

// Receber e descriptografar mensagem
async function receiveMessage(receiver: libsignal.SignalProtocolAddress, sender: libsignal.SignalProtocolAddress, receiverStore: SignalStorage, ciphertext: any) {
  const sessionCipher = new libsignal.SessionCipher(receiverStore, sender);
  const plaintext = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
  
  return new TextDecoder().decode(plaintext); // Convertendo Uint8Array de volta para string
}

// Simulação de troca de mensagens
async function messagingApp() {
  // Armazenamento para Alice e Bob
  const aliceStore = new SignalStorage();
  const bobStore = new SignalStorage();

  // Gerar identidades para Alice e Bob
  const { identityKeyPair: aliceIdentityKeyPair, registrationId: aliceRegistrationId } = await generateIdentity(aliceStore);
  const { identityKeyPair: bobIdentityKeyPair, registrationId: bobRegistrationId } = await generateIdentity(bobStore);

  // Gerar PreKeyBundle para Bob (enviado para Alice)
  const bobPreKeyBundle = await generatePreKeyBundle(bobStore, bobRegistrationId, bobIdentityKeyPair);

  // Criar endereços para Alice e Bob
  const aliceAddress = new libsignal.SignalProtocolAddress('alice', aliceRegistrationId);
  const bobAddress = new libsignal.SignalProtocolAddress('bob', bobRegistrationId);

  // Alice inicia sessão com Bob usando o PreKeyBundle de Bob
  await initSession(aliceAddress, bobAddress, aliceStore, bobStore, bobPreKeyBundle);

  // Alice envia uma mensagem criptografada para Bob
  const messageFromAlice = 'Olá, Bob! Como você está?';
  const encryptedMessage = await sendMessage(aliceAddress, bobAddress, aliceStore, messageFromAlice);

  console.log('Mensagem criptografada de Alice para Bob:', encryptedMessage);

  // Bob recebe e descriptografa a mensagem de Alice
  const decryptedMessage = await receiveMessage(bobAddress, aliceAddress, bobStore, encryptedMessage);
  console.log('Mensagem descriptografada recebida por Bob:', decryptedMessage);
}

messagingApp();
