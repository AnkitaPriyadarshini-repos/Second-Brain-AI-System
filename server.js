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

const noteController = new NoteControllerClass();
const chatController = new ChatControllerClass();
const goalController = new GoalControllerClass();

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

          // 2. Broadcast message to all connected clients in room
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'NEW_MESSAGE',
                message: result.message
              }));
            }
          });
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
