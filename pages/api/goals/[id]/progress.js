const GoalControllerClass = require('../../../../controllers/GoalController');
const goalController = new GoalControllerClass();

export default function handler(req, res) {
  const { id } = req.query;
  req.params = { id };

  if (req.method === 'POST') {
    return goalController.updateProgress(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
