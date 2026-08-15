const shareController = require('../../controllers/ShareController');

export default function handler(req, res) {
  if (req.method === 'POST') {
    return shareController.createShareLink(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
