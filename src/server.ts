import express, { Request, Response, NextFunction } from 'express';
import { SignalService } from './signal-service';
import bodyParser from 'body-parser';
import { SignalDirectory } from './signal-directory';
import { Database } from './database';
import { SignalOrchestrator } from './signal-orchestrator';

const app = express();
const port = 3000;

app.use(bodyParser.json());

/**
 * TODO: funções de directory e orchestrator no mesmo arquivo
 */
const directory = new SignalDirectory()
const database = new Database();
const orchestrator = new SignalOrchestrator(directory, database)

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

    if (database.userExists(username)) {
      return res.status(400).json({ error: `User ${username} already exists!` });
    }

    const userSignalService = new SignalService(directory)
    database.addUser(username, userSignalService)

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

    // Certifique-se de que a sessão entre os usuários foi configurada antes de tentar enviar a mensagem
    const fromService = database.getUser(from);
    const toService = database.getUser(to)

    if (!fromService || !toService) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Enviar a mensagem
    const encryptedMessage = await fromService.sendMessage(to, message);

    return res.status(200).json({
      cipher: encryptedMessage
    });
  })
);

// Endpoint para configurar a sessão
app.post(
  '/setupSession',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromUser, toUser } = req.body;

    if (!database.userExists(fromUser)) {
      return res.status(404).json({ error: `User ${fromUser} not found!` })
    }

    if (!database.userExists(toUser)) {
      return res.status(404).json({ error: `User ${toUser} not found!` })
    }

    await orchestrator.setupSession(fromUser, toUser);
  
    return res.status(200).json({ message: 'Session setup successfully' });
  })
);

// Iniciar o servidor HTTP
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
