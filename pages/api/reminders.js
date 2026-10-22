// Next.js pages/api delegate for Milo natural-language reminders
const handler = require('../../api/reminders');

module.exports = function (req, res) {
  return handler(req, res);
};
