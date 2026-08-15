const shareController = require('../../../controllers/ShareController');

export default function handler(req, res) {
  const { id } = req.query;
  req.params = { id };

  if (req.method === 'GET') {
    return shareController.getShareLink(req, res);
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
