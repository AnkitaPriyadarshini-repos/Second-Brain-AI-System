// Next.js pages/api delegate for Milo image generation
const handler = require('../../../api/media/image');

module.exports = function(req, res) {
  return handler(req, res);
};
