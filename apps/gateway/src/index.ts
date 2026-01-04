import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 8000;

const NODE_SERVICE_URL = process.env.NODE_SERVICE_URL || 'http://localhost:8001';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8002';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'gateway' });
});

// Forward helper
async function forward(targetUrl: string, req: express.Request, res: express.Response) {
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Forward error:', error);
    res.status(502).json({ error: 'Service unavailable' });
  }
}

// Node service routes
app.post('/api/convert/rest', (req, res) => forward(`${NODE_SERVICE_URL}/convert/rest`, req, res));
app.post('/api/convert/openapi', (req, res) => forward(`${NODE_SERVICE_URL}/convert/openapi`, req, res));

// Package route - forward to Node service
app.post('/api/skill/package', (req, res) => forward(`${NODE_SERVICE_URL}/skill/package`, req, res));

// Python service routes
app.post('/api/convert/mcp', (req, res) => forward(`${PYTHON_SERVICE_URL}/convert/mcp`, req, res));
app.post('/api/skill/validate', (req, res) => forward(`${PYTHON_SERVICE_URL}/skill/validate`, req, res));
app.post('/api/sandbox/run', (req, res) => forward(`${PYTHON_SERVICE_URL}/sandbox/run`, req, res));

// Service health aggregation
app.get('/api/health', async (req, res) => {
  const services: Record<string, string> = {
    gateway: 'healthy',
    nodeService: 'unknown',
    pythonService: 'unknown',
  };

  try {
    const nodeRes = await fetch(`${NODE_SERVICE_URL}/health`);
    services.nodeService = nodeRes.ok ? 'healthy' : 'unhealthy';
  } catch {
    services.nodeService = 'unreachable';
  }

  try {
    const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/health`);
    services.pythonService = pythonRes.ok ? 'healthy' : 'unhealthy';
  } catch {
    services.pythonService = 'unreachable';
  }

  res.json(services);
});

app.listen(port, () => {
  console.log(`Gateway running on port ${port}`);
  console.log(`  Node service: ${NODE_SERVICE_URL}`);
  console.log(`  Python service: ${PYTHON_SERVICE_URL}`);
});
