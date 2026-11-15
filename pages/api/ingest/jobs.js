const handler = require('../../../api/ingest/jobs');

export default async function apiHandler(req, res) {
  return handler(req, res);
}
