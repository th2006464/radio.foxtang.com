import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'style.css', 'app.js', 'scene.js', 'favicon.svg', 'earth.webp', 'globe.js', '_headers']) {
  await cp(file.startsWith('_') || file.endsWith('.html') || file.endsWith('.svg') || file.endsWith('.webp') ? file : `src/${file}`, `dist/${file}`);
}
console.log('Cloudflare Pages static build written to dist/');
