// Generates responsive WebP variants for every image in public/wp-content/uploads.
// Originals are kept untouched so the old WordPress image URLs keep working.
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public');
const SRC = path.join(ROOT, 'wp-content', 'uploads');
const OUT = path.join(ROOT, '_img');
const WIDTHS = [320, 480, 768, 1024, 1440];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const manifest = {};
const files = await walk(SRC);
for (const file of files) {
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  const meta = await sharp(file).metadata();
  const base = path.relative(SRC, file).replace(/\.[^.]+$/, '');
  const widths = WIDTHS.filter((w) => w < meta.width).concat(meta.width);
  const variants = [];
  for (const w of [...new Set(widths)]) {
    const outFile = path.join(OUT, `${base}-${w}.webp`);
    const url = '/_img/' + `${base}-${w}.webp`.split(path.sep).join('/');
    variants.push({ w, url });
    if (existsSync(outFile) && (await stat(outFile)).mtimeMs >= (await stat(file)).mtimeMs) continue;
    await mkdir(path.dirname(outFile), { recursive: true });
    await sharp(file).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(outFile);
  }
  manifest[rel] = { width: meta.width, height: meta.height, variants };
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/image-manifest.json', JSON.stringify(manifest, null, 1));
console.log(`images: ${files.length} originals -> ${Object.values(manifest).reduce((n, m) => n + m.variants.length, 0)} webp variants`);
