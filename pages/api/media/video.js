// Next.js pages/api delegate for Milo video generation
const handler = require('../../../api/media/video');

module.exports = function(req, res) {
  return handler(req, res);
};
