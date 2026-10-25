import { SITE, absUrl } from './site';
import { breadcrumbs, pages, TOPIC_NAMES, type Page } from './content';

// Every service page, so search and AI engines can map the full offering to the business
const offerCatalog = {
  '@type': 'OfferCatalog',
  name: 'שירותי אבטחה',
  itemListElement: pages
    .filter((x) => x.type === 'service')
    .map((x) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x.label, url: absUrl(x.path) } })),
};

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * JSON-LD graph per page. Replaces the WordPress output (Rank Math + a hand-written Product
 * snippet whose description belonged to another business and whose self-hosted rating
 * violated Google's review-snippet policy) with LocalBusiness / Service / FAQ / Breadcrumbs.
 */
export function pageSchema(p: Page) {
  const url = absUrl(p.path);
  const graph: any[] = [
    {
      '@type': ['HomeAndConstructionBusiness', 'Organization'],
      '@id': ORG_ID,
      name: SITE.name,
      alternateName: SITE.nameEn,
      url: SITE.url,
      logo: { '@type': 'ImageObject', '@id': `${SITE.url}/#logo`, url: absUrl(SITE.logo), caption: SITE.nameEn },
      image: { '@id': `${SITE.url}/#logo` },
      telephone: SITE.phoneIntl,
      email: SITE.email,
      foundingDate: String(SITE.foundingYear),
      openingHours: [SITE.openingHours],
      priceRange: '₪₪',
      address: { '@type': 'PostalAddress', addressCountry: 'IL' },
      areaServed: { '@type': 'Country', name: 'Israel' },
      contactPoint: { '@type': 'ContactPoint', telephone: SITE.phoneIntl, email: SITE.email, contactType: 'customer service', areaServed: 'IL', availableLanguage: ['he'] },
      knowsAbout: ['מצלמות אבטחה', 'מערכות אזעקה', 'אינטרקום', 'מצלמות IP', 'מעגל סגור', 'קודן לדלת', 'גלאי עשן', 'נקודות רשת ותקשורת'],
      hasOfferCatalog: offerCatalog,
    },
    { '@type': 'WebSite', '@id': SITE_ID, url: SITE.url, name: SITE.nameEn, alternateName: SITE.name, publisher: { '@id': ORG_ID }, inLanguage: 'he-IL' },
    {
      '@type': p.type === 'article' ? 'Article' : p.type === 'contact' ? 'ContactPage' : p.type === 'about' ? 'AboutPage' : 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: p.title,
      description: p.description || undefined,
      ...(p.type === 'article' ? { headline: p.h1, author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID } } : {}),
      datePublished: p.published || undefined,
      dateModified: p.modified || undefined,
      isPartOf: { '@id': SITE_ID },
      about: { '@id': ORG_ID },
      inLanguage: 'he-IL',
      ...(p.ogImage ? { primaryImageOfPage: { '@type': 'ImageObject', url: absUrl(p.ogImage) } } : {}),
      ...(p.type !== 'home' ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    },
  ];

  if (p.type !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: breadcrumbs(p).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.text, item: absUrl(c.href) })),
    });
  }

  if (p.type === 'service' || p.type === 'city') {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: p.label,
      serviceType: p.topic ? TOPIC_NAMES[p.topic] : undefined,
      description: p.description || undefined,
      provider: { '@id': ORG_ID },
      areaServed: p.city ? { '@type': 'City', name: p.city } : { '@type': 'Country', name: 'Israel' },
      url,
    });
  }

  const faqs = p.blocks.filter((b) => b.type === 'faq').flatMap((b) => b.items as { q: string; a: string }[]);
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) } })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
