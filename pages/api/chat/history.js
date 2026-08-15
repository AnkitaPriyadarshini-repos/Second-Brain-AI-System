const ChatControllerClass = require('../../../controllers/ChatController');
const chatController = new ChatControllerClass();

export default function handler(req, res) {
  if (req.method === 'GET') {
    return chatController.getHistory(req, res);
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
