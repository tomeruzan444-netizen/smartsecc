# סמארטסק – smartsecc.co.il

אתר סטטי מהיר שנבנה ב-[Astro](https://astro.build) במקום אתר הוורדפרס/אלמנטור הקודם.
כל 87 העמודים הועברו עם **אותן כתובות URL בדיוק**, אותם תגי `title` / `description` / `canonical` / `robots`,
אותו תוכן, אותם קישורים פנימיים ואותן תמונות (גם בנתיבי `wp-content/uploads` המקוריים) – כך שלא נדרשות הפניות 301.

## מה השתפר

| | וורדפרס + אלמנטור | האתר החדש |
|---|---|---|
| עמוד עיר | HTML ‎~27KB (gzip) + עשרות קבצי CSS/JS חיצוניים | HTML ‎~20KB (gzip) כולל כל ה-CSS, בלי קבצים חוסמים |
| JavaScript | jQuery + Elementor + Swiper ועוד | ‎~2KB (תפריט, טופס, תוכן עניינים) |
| תמונות | PNG/JPG מקוריים | WebP רספונסיבי (`srcset`) + lazy loading |
| פונט | Google Fonts חיצוני | Assistant מקומי, ‎7KB לעברית, preload |
| Schema | Rank Math + Product עם ביקורות עצמיות ותיאור של עסק אחר | LocalBusiness, Service, BreadcrumbList, FAQPage, WebPage |
| נגישות | – | HTML סמנטי, skip-link, ניווט מקלדת, ניגודיות AA |
| Lighthouse (מובייל) | – | ביצועים 99 · נגישות 100 · Best Practices 100 · SEO 100 · CLS 0 |
| מנועי חיפוש AI | – | `llms.txt`, הרשאה מפורשת ל-GPTBot / ClaudeBot / PerplexityBot ועוד ב-robots.txt, Schema עשיר |

UX חדש: תפריט מגה נגיש, סרגל צד מותאם לכל סוג עמוד (שירותים באותה עיר, ערים באותו אזור, שירותים קשורים, תוכן עניינים דביק),
טופס לידים ב-hero, סרגל התקשרות קבוע במובייל, שאלות ותשובות מתקפלות, וידאו שנטען רק בלחיצה.

## מבנה

```
src/data/pages.json      תוכן כל העמודים (נוצר מהמיגרציה)
src/data/shared.json     תפריט, פוטר, המלצות, טיפים
src/lib/                 SEO, schema, סרגלי צד, תמונות
src/components/          רכיבי עיצוב
src/pages/[slug].astro   כל העמודים הפנימיים (סלאגים בעברית)
public/wp-content/       התמונות המקוריות (נשמרות לכתובות הישנות)
public/contact.php       שליחת לידים במייל (PHP של הוסטינגר)
public/.htaccess         https, ללא www, סלאש בסוף, קאש, דחיסה, אבטחה
_migration/              סקריפטי המיגרציה מוורדפרס (extract.py, postprocess.py)
```

## פיתוח

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # בונה ל-dist/ ומריץ בדיקת SEO (scripts/verify-build.mjs)
```

`verify-build` נכשל אם עמוד כלשהו חסר, אם title/description/canonical שונים מהוורדפרס, או אם יש קישור/תמונה פנימיים שבורים.

## עדכון תוכן

עורכים את `src/data/pages.json` (או מוסיפים רשומה לעמוד חדש) ומריצים `npm run build`.
המיגרציה המקורית: `cd _migration && python extract.py && python postprocess.py` (דורש את קבצי ה-HTML שהורדו מהאתר החי).

## העלאה להוסטינגר

**אפשרות א' – אוטומטי (מומלץ):** כל push ל-`main` בונה את האתר ומפרסם את `dist/` לענף `deploy` (GitHub Actions).
ב-hPanel → Advanced → GIT: מחברים את הריפו, ענף `deploy`, תיקייה `public_html`, ומפעילים Auto Deployment.

**אפשרות ב' – ידני:** `npm run build` ומעלים את **תוכן** תיקיית `dist/` ל-`public_html` (File Manager / FTP).

לפני ההחלפה:
1. לגבות את האתר הישן (hPanel → Backups).
2. למחוק את קבצי הוורדפרס מ-`public_html` (או להעביר לתיקייה אחרת) ולהעלות את `dist/`.
3. ליצור תיבת דואר `no-reply@smartsecc.co.il` (או לשנות את `from` ב-`contact-config.php`) כדי שהטופס יוכל לשלוח מייל.
   הלידים נשמרים גם בקובץ CSV מחוץ ל-`public_html` (`../leads/`) כגיבוי.
4. לבדוק בטופס שליחה אמיתית, ולשלוח את `https://smartsecc.co.il/sitemap_index.xml` מחדש ב-Search Console.

הגדרות טופס פרטיות (לא נשמרות בגיט): יוצרים `public_html/contact-config.php`:

```php
<?php return ['to' => 'support@smartsecc.co.il', 'from' => 'no-reply@smartsecc.co.il'];
```
