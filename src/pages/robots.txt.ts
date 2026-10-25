import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /contact.php\n\nSitemap: ${SITE.url}/sitemap_index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
