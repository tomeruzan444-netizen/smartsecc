"""Enrich extracted pages: heading anchors, TOC, page type/topic/city classification.

Writes the site data consumed by Astro into ../src/data/.
"""
import json, os, re, sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')
pages = json.load(open('pages.json', encoding='utf-8'))
shared = json.load(open('shared.json', encoding='utf-8'))

# city -> region, used for "nearby areas" in sidebars
CITIES = {
    'תל אביב': 'center', 'רמת גן': 'center', 'גבעתיים': 'center', 'חולון': 'center', 'בת ים': 'center',
    'קרית אונו': 'center', 'יהוד': 'center', 'סביון': 'center', 'פתח תקווה': 'center', 'ראש העין': 'center',
    'גבעת שמואל': 'center', 'שוהם': 'center', 'לוד': 'center', 'רמלה': 'center', 'מודיעין': 'center',
    'ראשון לציון': 'shfela', 'נס ציונה': 'shfela', 'רחובות': 'shfela', 'יבנה': 'shfela', 'באר יעקב': 'shfela',
    'מזכרת בתיה': 'shfela', 'גדרה': 'shfela',
    'הרצליה': 'sharon', 'רעננה': 'sharon', 'כפר סבא': 'sharon', 'הוד השרון': 'sharon', 'רמת השרון': 'sharon',
    'נתניה': 'sharon', 'כפר יונה': 'sharon', 'אבן יהודה': 'sharon', 'כפר שמריהו': 'sharon',
    'חדרה': 'north', 'זכרון יעקב': 'north', 'חיפה': 'north', 'נשר': 'north', 'קריות': 'north', 'נהריה': 'north',
    'ירושלים': 'jerusalem',
    'אשדוד': 'south', 'אשקלון': 'south', 'באר שבע': 'south', 'נתיבות': 'south',
    # regional landing pages
    'מרכז': 'center', 'צפון': 'north', 'דרום': 'south',
}
REGION_NAMES = {'center': 'גוש דן והמרכז', 'shfela': 'השפלה', 'sharon': 'השרון', 'north': 'הצפון',
                'jerusalem': 'ירושלים והסביבה', 'south': 'הדרום'}
SPECIAL = {
    '': 'home', 'מדיניות-פרטיות': 'legal', 'הצהרת-נגישות': 'legal', 'צרו-קשר': 'contact', 'אודות': 'about',
    'אזורי-שירות': 'areas', 'הפרויקטים-של-סמארטסק': 'projects', 'חוק-מצלמות-אבטחה': 'article',
}
TOPICS = [('מצלמ', 'cameras'), ('אזעק', 'alarms'), ('אינטרקום', 'intercom')]
TOPIC_NAMES = {'cameras': 'מצלמות אבטחה', 'alarms': 'מערכות אזעקה', 'intercom': 'אינטרקום', 'other': 'פתרונות אבטחה נוספים'}


def city_of(slug):
    for city in sorted(CITIES, key=len, reverse=True):
        d = city.replace(' ', '-')
        if slug.endswith('-ב' + d) or slug.endswith('-' + d) or ('-ב' + d + '-') in slug:
            return city
    return None


def topic_of(slug):
    for k, t in TOPICS:
        if k in slug:
            return t
    return 'other'


def make_id(text, used):
    base = re.sub(r'[^\w֐-׿]+', '-', text).strip('-')[:60] or 'section'
    i, cand = 2, base
    while cand in used:
        cand = f'{base}-{i}'
        i += 1
    used.add(cand)
    return cand


for p in pages:
    used, toc = set(), []
    for b in p['blocks']:
        if b['type'] == 'heading' and b['level'] in ('h2', 'h3'):
            b['id'] = make_id(b['text'], used)
            toc.append({'id': b['id'], 'text': b['text'], 'level': int(b['level'][1])})
        elif b['type'] == 'rich':
            soup = BeautifulSoup(b['html'], 'html.parser')
            for h in soup.find_all(['h2', 'h3']):
                t = re.sub(r'\s+', ' ', h.get_text(' ')).strip()
                h['id'] = make_id(t, used)
                toc.append({'id': h['id'], 'text': t.rstrip(':'), 'level': int(h.name[1])})
            b['html'] = str(soup)
        elif b['type'] == 'faq':
            b['id'] = make_id('שאלות-ותשובות', used)
    p['toc'] = toc
    p['hasToc'] = any(b['type'] == 'toc' for b in p['blocks'])
    slug = p['slug']
    p['type'] = SPECIAL.get(slug) or ('city' if city_of(slug) else 'service')
    p['topic'] = topic_of(slug) if p['type'] in ('city', 'service', 'article') else None
    p['city'] = city_of(slug) if p['type'] == 'city' else None
    p['region'] = CITIES.get(p['city']) if p['city'] else None
    # short label used in sidebars/link lists ("התקנת מצלמות אבטחה בחולון")
    p['label'] = re.split(r'\s+[-–]\s+', p['h1'])[0].strip()

os.makedirs('../src/data', exist_ok=True)
json.dump(pages, open('../src/data/pages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
shared['regionNames'] = REGION_NAMES
shared['topicNames'] = TOPIC_NAMES
json.dump(shared, open('../src/data/shared.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

from collections import Counter
print(Counter(p['type'] for p in pages))
print(Counter((p['type'], p['topic']) for p in pages))
for p in pages:
    if p['type'] in ('city',):
        print(' ', p['city'], p['region'], p['topic'], '|', p['label'])
print('services:', [p['label'] for p in pages if p['type'] == 'service'])
