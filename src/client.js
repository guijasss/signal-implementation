const WebSocket = require('ws');
const axios = require('axios');

const serverAddress = 'ws://localhost:8088';
const apiAddress = 'http://localhost:3000';

// Função para registrar um usuário
async function registerUser(username) {
  try {
    const response = await axios.post(`${apiAddress}/register`, { username });
    console.log(response.data.message);
  } catch (error) {
    console.error(error.response.data.error);
  }
}

// Função para configurar uma sessão entre dois usuários
async function setupSession(fromUser, toUser) {
  try {
    const response = await axios.post(`${apiAddress}/setupSession`, { fromUser, toUser });
    console.log(response.data.message);
  } catch (error) {
    console.error(error.response.data.error);
  }
}

// Função para enviar uma mensagem
function sendMessage(socket, senderId, recipientId, content) {
  const message = { senderId, recipientId, content };
  socket.send(JSON.stringify(message));
}

// Conectar ao servidor WebSocket
const socket = new WebSocket(serverAddress);

socket.on('open', async () => {
  console.log("Sessão iniciada!");

  // Capturar a entrada do terminal e enviar para o servidor
  process.stdin.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      socket.send(message);
    }
  });
});

socket.on('message', (data) => {
  console.log(`Mensagem recebida do servidor: ${data}`);
});

socket.on('close', () => {
  console.log('Desconectado do servidor WebSocket');
});
