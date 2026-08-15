export default function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'Second Brain AI System',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
}
