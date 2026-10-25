export const SITE = {
  url: 'https://smartsecc.co.il',
  name: 'סמארטסק',
  nameEn: 'Smartsec',
  tagline: 'מומחים בהתקנת מערכות אבטחה מאז 1999',
  phone: '03-3769229',
  phoneHref: 'tel:033769229',
  phoneIntl: '+972-3-3769229',
  email: 'support@smartsecc.co.il',
  foundingYear: 1999,
  openingHours: 'Mo-Su 09:00-17:00',
  openingHoursText: 'א׳–ש׳, 09:00–17:00',
  logo: '/wp-content/uploads/2024/06/סמארטסק-1.png',
  googleSiteVerification: 'duYwsl0mWVWzsK_WiGsd8Y9NzcyZ5n0ixDfszyt0TwE',
  formEndpoint: '/contact.php',
} as const;

/** Absolute, percent-encoded URL exactly as WordPress emitted it (canonical, og:url, sitemap). */
export const absUrl = (path: string) => SITE.url + encodeURI(path);
