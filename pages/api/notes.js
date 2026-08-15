const NoteControllerClass = require('../../controllers/NoteController');
const noteController = new NoteControllerClass();

export default function handler(req, res) {
  if (req.method === 'GET') {
    return noteController.getNotes(req, res);
  } else if (req.method === 'POST') {
    return noteController.createNote(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
