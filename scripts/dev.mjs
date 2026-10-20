import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Run with wrangler pages dev dist to enable the Radio Browser API' })); return; }
    const target = resolve('.', `.${path === '/' ? '/index.html' : path}`);
    if (!target.startsWith(`${process.cwd()}/`)) { res.writeHead(403); res.end(); return; }
    const file = ['app.js', 'scene.js', 'style.css'].includes(path.slice(1)) ? `src/${path.slice(1)}` : path === '/' ? 'index.html' : path.slice(1);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8` }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(4173, () => console.log('Preview at http://localhost:4173 (API requires Cloudflare Pages dev)'));
