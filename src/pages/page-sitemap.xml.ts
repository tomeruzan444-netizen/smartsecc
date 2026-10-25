import type { APIRoute } from 'astro';
import { pages } from '../lib/content';
import { absUrl } from '../lib/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Same location Rank Math used, so the sitemap already submitted in Search Console keeps working
export const GET: APIRoute = () => {
  const urls = pages
    .filter((p) => !p.robots.includes('noindex'))
    .map((p) => {
      const imgs = [...new Set(p.blocks.flatMap((b) => (b.type === 'image' || b.type === 'imageBox') && b.src ? [b.src] : []))];
      return `<url><loc>${esc(absUrl(p.path))}</loc>${p.modified ? `<lastmod>${p.modified}</lastmod>` : ''}${imgs
        .map((i) => `<image:image><image:loc>${esc(absUrl(i))}</image:loc></image:image>`)
        .join('')}</url>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
