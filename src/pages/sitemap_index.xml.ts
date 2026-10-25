import type { APIRoute } from 'astro';
import { pages } from '../lib/content';
import { SITE } from '../lib/site';

export const GET: APIRoute = () => {
  const last = pages.map((p) => p.modified ?? '').sort().pop();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE.url}/page-sitemap.xml</loc>${last ? `<lastmod>${last}</lastmod>` : ''}</sitemap></sitemapindex>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
