const GoalControllerClass = require('../../controllers/GoalController');
const goalController = new GoalControllerClass();

export default function handler(req, res) {
  if (req.method === 'GET') {
    return goalController.getGoals(req, res);
  } else if (req.method === 'POST') {
    return goalController.createGoal(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
