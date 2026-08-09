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

// Initialize Next.js app
const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

const activeUsers = new Map();

nextApp.prepare().then(() => {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // Initialize WebSocket Server attached to the HTTP server
  const wss = new WebSocketServer({ noServer: false, server, path: '/ws/chat' });

  wss.on('connection', (socket, req) => {
    const userId = 'user-' + Math.random().toString(36).substring(2, 9);
    const user = { id: userId, name: `Researcher_${userId.substring(5)}`, room: 'general', connectedAt: Date.now() };
    activeUsers.set(socket, user);

    console.log(`[WebSocket] Client connected: ${user.name} (${userId})`);

    const initialHistory = chatController.chatService.getChannelHistory('general');

    // Send connection handshake + history
    socket.send(JSON.stringify({
      type: 'INIT_ACK',
      user,
      serverTime: Date.now(),
      activeUserCount: activeUsers.size,
      history: initialHistory.slice(-50),
      metrics: {
        targetLatencyMs: 300,
        ssrSpeedupFactor: '2.3x',
        protocol: 'ws-json-v1'
      }
    }));

    socket.on('message', (rawMessage) => {
      const receiveTime = Date.now();
      try {
        const payload = JSON.parse(rawMessage.toString());

        if (payload.type === 'PING') {
          socket.send(JSON.stringify({
            type: 'PONG',
            clientTimestamp: payload.clientTimestamp,
            serverTimestamp: receiveTime
          }));
          return;
        }

        if (payload.type === 'SEND_MESSAGE') {
          // Delegate message processing to ChatController & ChatService
          const result = chatController.handleIncomingMessage({
            ...payload,
            sender: payload.sender || user.name
          });

          if (result.error) {
            socket.send(JSON.stringify({ type: 'ERROR', message: result.error }));
            return;
          }

          // 1. Send immediate ACK back to sender
          socket.send(JSON.stringify({
            type: 'MESSAGE_ACK',
            ...result.ack
          }));

          // 2. Broadcast user message to all connected clients in room
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'NEW_MESSAGE',
                message: result.message
              }));
            }
          });

          // 3. Generate and broadcast AI Assistant response
          setTimeout(() => {
            const aiMsg = chatController.generateAIResponse(result.message);
            if (aiMsg) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'NEW_MESSAGE',
                    message: aiMsg
                  }));
                }
              });
            }
          }, 350);
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
      }
    });

    socket.on('close', () => {
      const disconnectedUser = activeUsers.get(socket);
      if (disconnectedUser) {
        activeUsers.delete(socket);
        console.log(`[WebSocket] Client disconnected: ${disconnectedUser.name}`);
      }
    });
  });

  // Express API endpoints routed through Controllers
  app.get('/api/notes', (req, res) => noteController.getNotes(req, res));
  app.post('/api/notes', (req, res) => noteController.createNote(req, res));
  app.post('/api/notes/:id/pin', (req, res) => noteController.togglePin(req, res));
  app.delete('/api/notes/:id', (req, res) => noteController.deleteNote(req, res));

  app.get('/api/chat/history', (req, res) => chatController.getHistory(req, res));

  app.get('/api/goals', (req, res) => goalController.getGoals(req, res));
  app.post('/api/goals', (req, res) => goalController.createGoal(req, res));
  app.post('/api/goals/:id/progress', (req, res) => goalController.updateProgress(req, res));

  // Authentication API Endpoints
  app.post('/api/auth/register', (req, res) => authController.register(req, res));
  app.post('/api/auth/login', (req, res) => authController.login(req, res));
  app.post('/api/auth/otp', (req, res) => authController.sendOTP(req, res));
  app.get('/api/auth/me', (req, res) => authController.me(req, res));
  app.post('/api/auth/logout', (req, res) => authController.logout(req, res));

  // Secure AI Gateway Endpoint
  app.post('/api/ai/gateway', (req, res) => aiGatewayController.handleQuery(req, res));

  // Share System API Endpoints
  app.post('/api/share', (req, res) => shareController.createShareLink(req, res));
  app.get('/api/share/:id', (req, res) => shareController.getShareLink(req, res));

  // Express static middleware for landing.html, index.html, css, js, and static assets
  app.use(express.static(__dirname));

  // Next.js page requests handler
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> 🚀 Next.js Layered App ready on http://localhost:${PORT}`);
    console.log(`> ⚡ WebSocket endpoint active at ws://localhost:${PORT}/ws/chat`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
});
