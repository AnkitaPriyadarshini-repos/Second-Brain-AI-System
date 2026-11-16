/**
 * Milo AI Workspace — Notes Serverless Endpoint
 * Handles /api/notes and /api/notes/:id for Vercel serverless deployment
 * with strict multi-tenant vault isolation and IDOR protection.
 */

const NoteController = require('../controllers/NoteController');
const noteController = new NoteController();

module.exports = async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  // Parse ID from query or URL path: /api/notes/:id -> ?id=:id
  const urlPath = (req.url || '').split('?')[0];
  const segments = urlPath.split('/').filter(Boolean);
  let id = (req.query && req.query.id) ? String(req.query.id) : null;
  if (!id && segments.length > 2 && segments[1] === 'notes') {
    id = segments[2];
  }
  req.params = { id };

  const method = req.method ? req.method.toUpperCase() : 'GET';

  if (method === 'GET') {
    if (id) {
      return noteController.getNoteById(req, res);
    }
    return noteController.getNotes(req, res);
  } else if (method === 'POST') {
    if (id && urlPath.endsWith('/pin')) {
      return noteController.togglePin(req, res);
    }
    return noteController.createNote(req, res);
  } else if (method === 'DELETE') {
    return noteController.deleteNote(req, res);
  } else {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
};
