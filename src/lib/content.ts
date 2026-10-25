import pagesData from '../data/pages.json';
import shared from '../data/shared.json';

export type Block = {
  type: 'heading' | 'rich' | 'image' | 'imageBox' | 'faq' | 'toc' | 'priceRange' | 'callout' | 'linkGroups' | 'html';
  _sec?: string | null;
  _col?: string | null;
  [k: string]: any;
};

export type PageType = 'home' | 'service' | 'city' | 'legal' | 'contact' | 'about' | 'areas' | 'projects' | 'article';
export type Topic = 'cameras' | 'alarms' | 'intercom' | 'other';

export type Page = {
  id: number;
  path: string;
  slug: string;
  h1: string;
  subtitle: string;
  label: string;
  title: string;
  description: string;
  robots: string;
  canonical: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  published?: string;
  modified?: string;
  blocks: Block[];
  toc: { id: string; text: string; level: number }[];
  hasToc: boolean;
  type: PageType;
  topic: Topic | null;
  city: string | null;
  region: string | null;
};

export const pages = pagesData as unknown as Page[];
export const SHARED = shared as any;
export const byPath = new Map(pages.map((p) => [p.path, p]));

export const TOPIC_NAMES: Record<Topic, string> = SHARED.topicNames;
export const REGION_NAMES: Record<string, string> = SHARED.regionNames;

// Hub page for each topic: the breadcrumb parent of its city/service pages
export const TOPIC_HUB: Record<Topic, string> = {
  cameras: '/התקנת-מצלמות-אבטחה/',
  alarms: '/התקנת-אזעקה/',
  intercom: '/התקנת-אינטרקום/',
  other: '/',
};

const cityPages = pages.filter((p) => p.type === 'city');
const servicePages = pages.filter((p) => p.type === 'service');

export const linkOf = (p: Page) => ({ href: p.path, text: p.label });

/** Breadcrumb trail: home → topic hub (or areas page for cities) → page. */
export function breadcrumbs(p: Page) {
  const trail = [{ href: '/', text: 'דף הבית' }];
  if (p.type === 'city') {
    trail.push({ href: '/אזורי-שירות/', text: 'אזורי שירות' });
  } else if (p.topic && p.topic !== 'other' && p.path !== TOPIC_HUB[p.topic]) {
    const hub = byPath.get(TOPIC_HUB[p.topic]);
    if (hub) trail.push(linkOf(hub));
  }
  if (p.type !== 'home') trail.push({ href: p.path, text: p.label });
  return trail;
}

/** Data for the custom sidebars – every list is built from real pages so links never break. */
export function sidebarFor(p: Page) {
  const sameTopicCities = cityPages.filter((c) => c.topic === p.topic && c.path !== p.path);
  if (p.type === 'city') {
    const sameCity = pages.filter((x) => x.city === p.city && x.path !== p.path);
    const nearby = sameTopicCities.filter((c) => c.region === p.region);
    const services = servicePages.filter((s) => s.topic === p.topic);
    return {
      groups: [
        sameCity.length && { title: `שירותים נוספים ב${p.city}`, links: sameCity.map(linkOf) },
        nearby.length && { title: `${TOPIC_NAMES[p.topic!]} באזור ${REGION_NAMES[p.region!]}`, links: nearby.map(linkOf) },
        services.length && { title: `שירותי ${TOPIC_NAMES[p.topic!]}`, links: services.map(linkOf) },
      ].filter(Boolean) as { title: string; links: { href: string; text: string }[] }[],
    };
  }
  if (p.type === 'service' || p.type === 'article') {
    const related = servicePages.filter((s) => s.topic === p.topic && s.path !== p.path);
    const others = servicePages.filter((s) => s.topic !== p.topic).slice(0, 8);
    return {
      groups: [
        related.length && { title: 'שירותים קשורים', links: related.map(linkOf) },
        sameTopicCities.length && {
          title: `${TOPIC_NAMES[p.topic!]} לפי עיר`,
          links: sameTopicCities.slice(0, 12).map(linkOf),
          more: { href: '/אזורי-שירות/', text: 'לכל אזורי השירות' },
        },
        !related.length && others.length && { title: 'שירותים נוספים', links: others.map(linkOf) },
      ].filter(Boolean) as { title: string; links: { href: string; text: string }[]; more?: { href: string; text: string } }[],
    };
  }
  return {
    groups: [
      { title: 'השירותים שלנו', links: servicePages.filter((s) => s.topic !== 'other').slice(0, 10).map(linkOf) },
    ],
  };
}

/**
 * Group consecutive blocks by Elementor section, then by runs of the same column.
 * Source order is always preserved (Elementor nests columns, so a column id can reappear).
 */
export function sections(blocks: Block[]) {
  const out: { sec: string | null | undefined; cols: Block[][] }[] = [];
  let prevCol: string | null | undefined;
  for (const b of blocks) {
    let s = out[out.length - 1];
    if (!s || s.sec !== b._sec) {
      s = { sec: b._sec, cols: [] };
      out.push(s);
      prevCol = undefined;
    }
    if (s.cols.length && prevCol === b._col) s.cols[s.cols.length - 1].push(b);
    else s.cols.push([b]);
    prevCol = b._col;
  }
  return out;
}
