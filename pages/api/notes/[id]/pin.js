const NoteControllerClass = require('../../../../controllers/NoteController');
const noteController = new NoteControllerClass();

export default function handler(req, res) {
  const { id } = req.query;
  req.params = { id };

  if (req.method === 'POST') {
    return noteController.togglePin(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
