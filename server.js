// Lokal ishga tushirish: API + statik frontend bitta portda. `npm start`
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './src/app.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env bo'lmasa muhit o'zgaruvchilaridan foydalanamiz
}

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  let filePath = normalize(join(PUBLIC_DIR, decodeURIComponent(pathname)));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    let info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath);
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Sahifa topilmadi');
  }
}

createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url === '/api') return handleApi(req, res);
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Navbat ishga tushdi: http://localhost:${PORT}`);
});
