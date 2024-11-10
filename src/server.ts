import express, { Request, Response, NextFunction } from 'express';
import { SignalService } from './signal-service';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import { SignalProtocolStore } from './signal-store';
import { isJson } from './helpers'
import { SignalDirectory } from './signal-directory';
import { base64ToArrayBuffer } from './parsers';

const app = express();
const port = 3000;

app.use(bodyParser.json());

const store = new SignalProtocolStore() 
const directory = new SignalDirectory()

// Objeto para armazenar os usuários e seus serviços
const users: Record<string, { service: SignalService; socket?: WebSocket }> = {};

// Middleware para lidar com promessas e erros
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return function (req: Request, res: Response, next: NextFunction) {
    fn(req, res, next).catch(next);
  };
}

// Endpoint para registrar usuários
app.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;

    if (users[username]) {
      return res.status(400).json({ error: `User ${username} already exists!` });
    }

    const userSignalService = new SignalService(store, directory)
    users[username] = { service: userSignalService };
    
    const keys = await userSignalService.register(username);

    return res.status(200).json({
      message: `User ${username} was created!`,
      keys: keys
    });
  })
);

app.post(
  '/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to, message } = req.body;
    const fromService = users[from].service;
    
    const encryptedMessage = await fromService.encryptMessage(to, message)
    const decryptedMessage = await fromService.decryptMessage(to, encryptedMessage) 

    return res.status(200).json({
      message: decryptedMessage,
      cipher: encryptedMessage
    })
  })
)

// Endpoint para configurar a sessão
app.post(
  '/setupSession',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromUser, toUser } = req.body;

    const fromService = users[fromUser]?.service;
    const toService = users[toUser]?.service;

    if (!fromService || !toService) {
      return res.status(404).json({ error: 'User not found' });
    }

    await fromService.setupSession(toUser);
  
    return res.status(200).json({ message: 'Session setup successfully' });
  })
);

// Iniciar o servidor HTTP
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Criação do servidor WebSocket
const wss = new WebSocket.Server({ port: 8088 });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', async (message: string) => {
    console.log(`Mensagem recebida: ${message}`);

    message = message.toString()

    if (message.startsWith("/register")) {
      const username = message.split(" ")[1];
      if (users[username]) {
        ws.send(`User ${username} already exists!`);
        return;
      }

      users[username] = { service: new SignalService(store, directory), socket: ws };
      ws.send(`User ${username} registered successfully!`);
      return;
    }

    if (message.startsWith("/session")) {
      const [_, sender, recipient] = message.split(" ");

      const fromService = users[sender]?.service;
      const toService = users[recipient]?.service;

      if (!fromService || !toService) {
        ws.send('One or both users not found');
        return;
      }

      await fromService.setupSession(recipient);
      ws.send(`Session between ${sender} and ${recipient} created!`);
      return;
    }

    if (isJson(message)) {
      try {
        const parsedMessage = JSON.parse(message);
        const { sender, recipient, content } = parsedMessage;

        const senderService = users[sender]?.service;
        if (!senderService) {
          ws.send('Sender not registered');
          return;
        }

        // Criptografa a mensagem usando o protocolo Signal
        const encryptedMessage = await senderService.encryptMessage(content, recipient);
        console.log(`Mensagem criptografada: ${encryptedMessage}`);

        // Envia a mensagem criptografada para o destinatário
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              sender,
              recipient,
              encryptedMessage
            }));
          }
        });
      } catch (error) {
        console.error('Erro ao criptografar a mensagem:', error);
      }
    }

  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Função para lidar com o envio de mensagens
async function handleSendMessage(data: string, ws: WebSocket) {
  console.log("AAA"+data);
}

//{"sender": "L", "recipient": "C", "content": "Hi!"}