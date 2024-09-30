import express, { Request, Response, NextFunction } from 'express';
import { SignalService } from './signal-service';
import { SignalProtocolStore } from './signal-store'
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Armazenamento em memória
const users: Record<string, SignalService> = {};

// Middleware para lidar com promessas e erros
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return function (req: Request, res: Response, next: NextFunction) {
    fn(req, res, next).catch(next);
  };
}

// Rota para registro de usuário
app.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verifica se o usuário já existe
    if (users[username]) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Cria um novo usuário e armazena o serviço de Signal
    const signalService = new SignalService();
    users[username] = signalService;

    return res.status(201).json({ message: 'User registered successfully' });
  })
);

// Rota para envio de mensagens
app.post(
  '/sendMessage',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromUser, toUser, message } = req.body;

    if (!fromUser || !toUser || !message) {
      return res.status(400).json({ error: 'fromUser, toUser, and message are required' });
    }

    const fromService = users[fromUser];
    const toService = users[toUser];

    if (!fromService || !toService) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Envia a mensagem criptografada
      await fromService.sendMessage(toUser, message);
      return res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  })
);

// Rota para receber mensagens
app.post(
  '/receiveMessage',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromUser, toUser, ciphertext } = req.body;

    if (!fromUser || !toUser || !ciphertext) {
      return res.status(400).json({ error: 'fromUser, toUser, and ciphertext are required' });
    }

    const toService = users[toUser];

    if (!toService) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    try {
      const message = await toService.receiveMessage(fromUser, ciphertext);
      return res.status(200).json({ message });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to receive message' });
    }
  })
);

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
