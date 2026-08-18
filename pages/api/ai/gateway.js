const AIGatewayControllerClass = require('../../../controllers/AIGatewayController');
const aiGatewayController = new AIGatewayControllerClass();

// Keep request bodies bounded at the Next.js API boundary as well as in the
// controller, preventing oversized context/history payloads from consuming
// unnecessary serverless memory.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'POST') {
    return await aiGatewayController.handleQuery(req, res);
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
