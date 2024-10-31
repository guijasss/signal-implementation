import express, { Request, Response, NextFunction } from 'express';
import { SignalService } from './signal-service';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use(bodyParser.json());


const users: Record<string, SignalService> = {
  "Alice": new SignalService(),
  "Bob": new SignalService()
};

// Middleware para lidar com promessas e erros
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return function (req: Request, res: Response, next: NextFunction) {
    fn(req, res, next).catch(next);
  };
}

app.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;

    if (users[username]) {
      return res.status(400).json({ error: `User ${username} already exists!` })
    }

    users[username] = new SignalService();

    return res.status(200).json({ message: `User ${username} was created!` })
  })
)

app.post(
  '/setupSession',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromUser, toUser } = req.body;

    const fromService = users[fromUser];
    const toService = users[toUser];

    if (!fromService || !toService) {
      return res.status(404).json({ error: 'User not found' });
    }

    await fromService.createSession(fromUser, toUser, fromService.store);
  
    return res.status(200).json({ message: 'Session setup successfully' });
  })
);

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
