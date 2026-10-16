import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const gasUrl = String(process.env.GAS_WEB_APP_URL || '').trim();

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname, { index: 'index.html', extensions: ['html'] }));

app.get('/health', (_req, res) => res.json({ ok: true, app: 'VeloRent Node.js server', apiConfigured: Boolean(gasUrl) }));

app.post('/api', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!gasUrl || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(gasUrl)) {
    return res.status(500).json({ ok: false, error: 'GAS_WEB_APP_URL is missing or invalid. Copy your deployed Apps Script /exec URL into .env.' });
  }
  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ ok: false, error: 'Apps Script returned a non-JSON response. Check the web app deployment and access settings.' }); }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Apps Script request failed:', error?.message || error);
    return res.status(502).json({ ok: false, error: 'Could not connect to the Google Apps Script backend. Check internet access and GAS_WEB_APP_URL.' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ ok: false, error: 'API route not found.' });
  res.sendFile(path.join(__dirname, 'index.html'), err => { if (err) next(err); });
});

app.listen(port, () => {
  console.log(`VeloRent Node.js is running at http://localhost:${port}`);
  if (!gasUrl) console.warn('GAS_WEB_APP_URL is not configured. Create .env before signing in.');
});
