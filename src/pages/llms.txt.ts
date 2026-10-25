import type { APIRoute } from 'astro';
import { pages, TOPIC_NAMES, type Page, type Topic } from '../lib/content';
import { SITE, absUrl } from '../lib/site';

// llms.txt (llmstxt.org): a plain-text map of the site for AI answer engines
const line = (p: Page) => `- [${p.label}](${absUrl(p.path)})${p.description ? `: ${p.description}` : ''}`;
const topics: Topic[] = ['cameras', 'alarms', 'intercom', 'other'];

export const GET: APIRoute = () => {
  const services = pages.filter((p) => p.type === 'service');
  const cities = pages.filter((p) => p.type === 'city');
  const info = pages.filter((p) => ['about', 'contact', 'areas', 'projects', 'article', 'legal'].includes(p.type));
  const body = [
    `# ${SITE.name} (${SITE.nameEn})`,
    '',
    `> ${SITE.name} – ${SITE.tagline}. התקנה, תיקון ותחזוקה של מצלמות אבטחה, מערכות אזעקה, אינטרקום, קודנים, גלאי עשן ונקודות רשת לבית ולעסק, בפריסה ארצית בישראל. הצעת מחיר חינם.`,
    '',
    `- טלפון: ${SITE.phone}`,
    `- אימייל: ${SITE.email}`,
    `- שעות פעילות: ${SITE.openingHoursText}`,
    `- אתר: ${SITE.url}`,
    '',
    ...topics.flatMap((t) => {
      const list = services.filter((s) => s.topic === t);
      return list.length ? [`## ${TOPIC_NAMES[t]}`, '', ...list.map(line), ''] : [];
    }),
    '## אזורי שירות',
    '',
    ...cities.map(line),
    '',
    '## מידע',
    '',
    ...info.map(line),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
