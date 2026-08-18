/**
 * Second Brain AI System — Next.js SSR + Real-Time WebSocket Server (Layered Architecture)
 * Layered Server using Controllers (HTTP/WS), Services (Domain Logic), and Repositories (Data Access).
 */

const http = require('http');
const express = require('express');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');

const NoteControllerClass = require('./controllers/NoteController');
const ChatControllerClass = require('./controllers/ChatController');
const GoalControllerClass = require('./controllers/GoalController');
const AuthControllerClass = require('./controllers/AuthController');
const AIGatewayControllerClass = require('./controllers/AIGatewayController');
const ShareControllerClass = require('./controllers/ShareController');

const noteController = new NoteControllerClass();
const chatController = new ChatControllerClass();
const goalController = new GoalControllerClass();
const authController = new AuthControllerClass();
const aiGatewayController = new AIGatewayControllerClass();
const shareController = new ShareControllerClass();

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();
const activeUsers = new Map();

nextApp.prepare().then(() => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: false, server, path: '/ws/chat', maxPayload: 256 * 1024 });

  wss.on('connection', (socket) => {
    const userId = 'user-' + Math.random().toString(36).substring(2, 9);
    const user = { id: userId, name: `Researcher_${userId.substring(5)}`, room: 'general', connectedAt: Date.now() };
    activeUsers.set(socket, user);

    const initialHistory = chatController.chatService.getChannelHistory('general');
    socket.send(JSON.stringify({
      type: 'INIT_ACK', user, serverTime: Date.now(), activeUserCount: activeUsers.size,
      history: initialHistory.slice(-50),
      metrics: { targetLatencyMs: 300, ssrSpeedupFactor: '2.3x', protocol: 'ws-json-v1' }
    }));

    socket.on('message', (rawMessage) => {
      const receiveTime = Date.now();
      try {
        const payload = JSON.parse(rawMessage.toString());

        if (payload.type === 'PING') {
          socket.send(JSON.stringify({ type: 'PONG', clientTimestamp: payload.clientTimestamp, serverTimestamp: receiveTime }));
          return;
        }

        if (payload.type === 'SEND_MESSAGE') {
          const result = chatController.handleIncomingMessage({ ...payload, sender: payload.sender || user.name });
          if (result.error) {
            socket.send(JSON.stringify({ type: 'ERROR', message: result.error }));
            return;
          }

          socket.send(JSON.stringify({ type: 'MESSAGE_ACK', ...result.ack }));
          const targetRoom = result.message.room || 'general';
          wss.clients.forEach((client) => {
            const clientUser = activeUsers.get(client);
            if (client.readyState === WebSocket.OPEN && (!clientUser || clientUser.room === targetRoom)) {
              client.send(JSON.stringify({ type: 'NEW_MESSAGE', message: result.message }));
            }
          });

          setTimeout(() => {
            const aiMsg = chatController.generateAIResponse(result.message);
            if (aiMsg) {
              wss.clients.forEach((client) => {
                const clientUser = activeUsers.get(client);
                if (client.readyState === WebSocket.OPEN && (!clientUser || clientUser.room === targetRoom)) {
                  client.send(JSON.stringify({ type: 'NEW_MESSAGE', message: aiMsg }));
                }
              });
            }
          }, 350);
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message payload.' }));
      }
    });

    socket.on('close', () => activeUsers.delete(socket));
  });

  app.get('/api/notes', (req, res) => noteController.getNotes(req, res));
  app.post('/api/notes', (req, res) => noteController.createNote(req, res));
  app.post('/api/notes/:id/pin', (req, res) => noteController.togglePin(req, res));
  app.delete('/api/notes/:id', (req, res) => noteController.deleteNote(req, res));
  app.get('/api/chat/history', (req, res) => chatController.getHistory(req, res));
  app.get('/api/goals', (req, res) => goalController.getGoals(req, res));
  app.post('/api/goals', (req, res) => goalController.createGoal(req, res));
  app.post('/api/goals/:id/progress', (req, res) => goalController.updateProgress(req, res));
  app.post('/api/auth/register', (req, res) => authController.register(req, res));
  app.post('/api/auth/login', (req, res) => authController.login(req, res));
  app.post('/api/auth/otp', (req, res) => authController.sendOTP(req, res));
  app.get('/api/auth/me', (req, res) => authController.me(req, res));
  app.post('/api/auth/logout', (req, res) => authController.logout(req, res));
  app.post('/api/ai/gateway', (req, res) => aiGatewayController.handleQuery(req, res));
  app.post('/api/share', (req, res) => shareController.createShareLink(req, res));
  app.get('/api/share/:id', (req, res) => shareController.getShareLink(req, res));

  app.use(express.static(__dirname));
  app.all('*', (req, res) => handle(req, res));

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> 🚀 Next.js Layered App ready on http://localhost:${PORT}`);
    console.log(`> ⚡ WebSocket endpoint active at ws://localhost:${PORT}/ws/chat`);
  });
}).catch((err) => console.error('Failed to start server:', err));
