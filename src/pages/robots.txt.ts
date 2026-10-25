import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

// Search and AI answer-engine crawlers are welcome explicitly (some sites block them by default)
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot'];

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /contact.php',
      '',
      ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', 'Disallow: /contact.php', '']),
      `Sitemap: ${SITE.url}/sitemap_index.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
