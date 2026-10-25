// Post-build SEO safety net: every WordPress URL must exist with the same title, description
// and canonical, and every internal link / image in the build must resolve to a real file.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const pages = JSON.parse(await readFile('src/data/pages.json', 'utf8'));
const errors = [];

const fileFor = (urlPath) => {
  const p = decodeURI(urlPath.split('#')[0].split('?')[0]);
  if (p.endsWith('/')) return path.join(DIST, p, 'index.html');
  return path.join(DIST, p);
};
const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const pick = (html, re) => decodeEntities(re.exec(html)?.[1] ?? '');

for (const p of pages) {
  const f = fileFor(p.path);
  if (!existsSync(f)) { errors.push(`missing page ${p.path}`); continue; }
  const html = await readFile(f, 'utf8');
  const title = pick(html, /<title>([^<]*)<\/title>/);
  const desc = pick(html, /<meta name="description" content="([^"]*)"/);
  const canon = pick(html, /<link rel="canonical" href="([^"]*)"/);
  if (title !== p.title) errors.push(`title mismatch ${p.path}: "${title}" != "${p.title}"`);
  if (desc !== p.description) errors.push(`description mismatch ${p.path}`);
  if (decodeURI(canon) !== 'https://smartsecc.co.il' + p.path) errors.push(`canonical mismatch ${p.path}: ${canon}`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`expected exactly one h1 on ${p.path}`);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const broken = new Map();
for (const f of await walk(DIST)) {
  const html = await readFile(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const u = decodeEntities(m[1]);
    if (u.startsWith('//')) continue;
    if (!existsSync(fileFor(u))) broken.set(u, path.relative(DIST, f));
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/') && !existsSync(fileFor(decodeEntities(u)))) broken.set(u, path.relative(DIST, f));
    }
  }
}
for (const [u, from] of broken) errors.push(`broken internal link/asset ${u} (in ${from})`);

if (errors.length) {
  console.error(`verify-build: ${errors.length} problem(s)\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`verify-build: OK – ${pages.length} pages match WordPress titles/descriptions/canonicals; all internal links and images resolve.`);
