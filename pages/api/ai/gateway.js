const AIGatewayControllerClass = require('../../../controllers/AIGatewayController');
const aiGatewayController = new AIGatewayControllerClass();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return await aiGatewayController.handleQuery(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
