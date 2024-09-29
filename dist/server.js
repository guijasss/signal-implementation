"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const libsignal = __importStar(require("libsignal"));
// Inicializa o servidor
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
const PORT = 3000;
// Armazenamento de dados em memória
let users = {};
// Função para gerar e armazenar chaves de um novo usuário
app.post('/register', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }
    // Gerar par de chaves
    const identityKeyPair = libsignal.KeyHelper.generateIdentityKeyPair();
    const registrationId = libsignal.KeyHelper.generateRegistrationId();
    const preKeys = libsignal.KeyHelper.generatePreKeys(0, 100);
    const signedPreKey = libsignal.KeyHelper.generateSignedPreKey(identityKeyPair, 0);
    users[userId] = {
        identityKeyPair,
        registrationId,
        preKeys,
        signedPreKey,
        sessions: {},
    };
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
        res.status(400).json({ error: 'senderId, recipientId, and message are required' });
        return;
    }
    const recipient = users[recipientId];
    const sender = users[senderId];
    if (!recipient) {
        res.status(404).json({ error: 'Recipient not found' });
        return;
    }
    if (!sender) {
        res.status(404).json({ error: 'Sender not found' });
        return;
    }
    const address = new libsignal.SignalProtocolAddress(recipientId, 1);
    const sessionBuilder = new libsignal.SessionBuilder(sender.sessions, address);
    const preKeyBundle = {
        identityKey: recipient.identityKeyPair.pubKey,
        registrationId: recipient.registrationId,
        preKey: recipient.preKeys[0].keyPair.pubKey,
        signedPreKey: recipient.signedPreKey.keyPair.pubKey,
        signedPreKeySignature: recipient.signedPreKey.signature
    };
    try {
        await sessionBuilder.processPreKeyBundle(preKeyBundle);
        const sessionCipher = new libsignal.SessionCipher(sender.sessions, address);
        const ciphertext = await sessionCipher.encrypt(Buffer.from(message));
        res.json({ ciphertext });
    }
    catch (err) {
        console.error('Error encrypting message:', err);
        res.status(500).json({ error: 'Error encrypting message' });
    }
});
// Decifrar uma mensagem recebida
app.post('/receive', async (req, res) => {
    const { recipientId, senderId, ciphertext } = req.body;
    if (!recipientId || !senderId || !ciphertext) {
        res.status(400).json({ error: 'recipientId, senderId, and ciphertext are required' });
        return;
    }
    const recipient = users[recipientId];
    if (!recipient) {
        res.status(404).json({ error: 'Recipient not found' });
        return;
    }
    const address = new libsignal.SignalProtocolAddress(senderId, 1);
    const sessionCipher = new libsignal.SessionCipher(recipient.sessions, address);
    try {
        const plaintext = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
        res.json({ message: plaintext.toString() });
    }
    catch (err) {
        console.error('Error decrypting message:', err);
        res.status(500).json({ error: 'Error decrypting message' });
    }
});
// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
