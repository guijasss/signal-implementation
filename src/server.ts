import express, { Request, Response, NextFunction } from 'express';
import { SignalService } from './signal-service';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import { SignalProtocolStore } from './signal-store';
import axios from 'axios';

const app = express();
const port = 3000;

app.use(bodyParser.json());

const store = new SignalProtocolStore() 

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

    users[username] = { service: new SignalService(store) };

    return res.status(200).json({ message: `User ${username} was created!` });
  })
);

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

    await fromService.createSession(fromUser, toUser);
  
    return res.status(200).json({ message: 'Session setup successfully' });
  })
);

// Iniciar o servidor HTTP
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(users);
});

// Criação do servidor WebSocket
const wss = new WebSocket.Server({ port: 8088 });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message: string) => {
    console.log(`Mensagem recebida: ${message}`);

    if (message.toString().startsWith("/register")) {
      const username = message.toString().split(" ")[1]
      users[username] = { service: new SignalService(store) };
      console.log(users);
    }

    // Envia a mensagem para todos os clientes conectados
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Função para lidar com o envio de mensagens
async function handleSendMessage(data: string, ws: WebSocket) {
  console.log(data);
  ws.send(JSON.stringify({message: data}))
}
