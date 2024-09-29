const express = require('express');
const bodyParser = require('body-parser');
const libsignal = require('libsignal-protocol');

// Inicializa o servidor
const app = express();
app.use(bodyParser.json());
const PORT = 3000;

// Armazenamento de usuários e sessões
let users = {};

// Rota para registrar um novo usuário
app.post('/register', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Gerar chaves de identidade, registro, pre-keys e signedPreKey
  const identityKeyPair = libsignal.keyhelper.generateIdentityKeyPair();
  const registrationId = libsignal.keyhelper.generateRegistrationId();
  const preKeys = libsignal.keyhelper.generatePreKey(0, 100);
  const signedPreKey = libsignal.keyhelper.generateSignedPreKey(identityKeyPair, 0);

  // Armazenar informações do usuário
  users[userId] = {
    identityKeyPair,
    registrationId,
    preKeys,
    signedPreKey,
    sessions: {},
  };

  // Retornar as chaves do usuário
  res.json({
    registrationId,
    identityKey: identityKeyPair.pubKey,
    preKeys,
    signedPreKey,
  });
});

// Enviar uma mensagem criptografada
app.post('/send', async (req, res) => {
  const { senderId, recipientId, message } = req.body;

  if (!senderId || !recipientId || !message) {
    return res.status(400).json({ error: 'senderId, recipientId, and message are required' });
  }

  const recipient = users[recipientId];
  const sender = users[senderId];

  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  if (!sender) {
    return res.status(404).json({ error: 'Sender not found' });
  }

  const address = new libsignal.SignalProtocolAddress(recipientId, 1);
  const sessionBuilder = new libsignal.SessionBuilder(sender.sessions, address);

  console.log(users)
  console.log("-----------------------");
  console.log(recipient)
  console.log("-----------------------")
  console.log(recipientId)

  // Bundle de pre-keys do destinatário
  const preKeyBundle = {
    identityKey: recipient.identityKeyPair.pubKey,
    registrationId: recipient.registrationId,
    preKey: recipient.preKeys.keyPair.pubKey,
    signedPreKey: recipient.signedPreKey.keyPair.pubKey,
    signedPreKeySignature: recipient.signedPreKey.signature
  };

  try {
    // Processo de estabelecimento de sessão com o bundle de pre-keys
    await sessionBuilder.processPreKeyBundle(preKeyBundle);
    
    // Criação de um cifrador de sessão para enviar a mensagem
    const sessionCipher = new libsignal.SessionCipher(sender.sessions, address);
    
    // Criptografar a mensagem
    const ciphertext = await sessionCipher.encrypt(Buffer.from(message));

    // Enviar a mensagem criptografada de volta
    res.json({ ciphertext });
  } catch (err) {
    console.error('Error encrypting message:', err);
    res.status(500).json({ error: 'Error encrypting message' });
  }
});

// Receber e decifrar uma mensagem criptografada
app.post('/receive', async (req, res) => {
  const { recipientId, senderId, ciphertext } = req.body;

  if (!recipientId || !senderId || !ciphertext) {
    return res.status(400).json({ error: 'recipientId, senderId, and ciphertext are required' });
  }

  const recipient = users[recipientId];

  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  const address = new libsignal.ProtocolAddress(senderId, 1);
  const sessionCipher = new libsignal.SessionCipher(recipient.sessions, address);

  try {
    // Descriptografar a mensagem
    const plaintext = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
    
    // Retornar a mensagem descriptografada
    res.json({ message: plaintext.toString() });
  } catch (err) {
    console.error('Error decrypting message:', err);
    res.status(500).json({ error: 'Error decrypting message' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
