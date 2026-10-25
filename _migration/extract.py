"""Extract structured content from the downloaded WordPress/Elementor HTML.

Output: pages.json (one record per page) + images.json (every image URL referenced).
"""
import json, re, sys, urllib.parse as up
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype

sys.stdout.reconfigure(encoding='utf-8')
SITE = 'https://smartsecc.co.il'
F = json.load(open('fetched.json', encoding='utf-8'))
IMAGES = set()

KEEP = {'h2', 'h3', 'h4', 'h5', 'p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'br',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'img', 'figure', 'figcaption', 'span', 'u'}


def clean_text(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def norm_url(href):
    """Turn absolute site links into root-relative decoded paths; leave external links alone."""
    if not href:
        return href
    href = href.strip()
    if href.startswith(('tel:', 'mailto:', '#', 'https://wa.me', 'whatsapp:')):
        return href
    p = up.urlparse(href)
    if p.netloc in ('smartsecc.co.il', 'www.smartsecc.co.il') or (not p.netloc and href.startswith('/')):
        path = up.unquote(p.path) or '/'
        if not path.endswith('/') and '.' not in path.rsplit('/', 1)[-1]:
            path += '/'
        return path + (('#' + p.fragment) if p.fragment else '')
    return href


def img_src(tag):
    src = tag.get('data-src') or tag.get('src') or ''
    if src.startswith('data:'):
        src = tag.get('data-lazy-src') or ''
    if src.startswith('//'):
        src = 'https:' + src
    if src.startswith('/'):
        src = SITE + src
    return src


def local_img(src):
    """WordPress uploads keep their original path so existing image URLs keep working."""
    p = up.urlparse(src)
    if p.netloc.endswith('smartsecc.co.il') and '/wp-content/' in p.path:
        IMAGES.add(src)
        return up.unquote(p.path)
    return src


def sanitize(node):
    """Return clean semantic HTML for a fragment: no classes/styles/scripts, normalized links/images."""
    node = BeautifulSoup(str(node), 'html.parser')
    for t in node(['script', 'style', 'noscript', 'svg', 'head', 'title', 'meta', 'link', 'iframe', 'form', 'button', 'input']):
        t.decompose()
    for c in node.find_all(string=lambda s: isinstance(s, (Comment, Doctype))):
        c.extract()
    for t in node.find_all(True):
        if t.name == 'img':
            src = img_src(t)
            if not src or 'placeholder' in src:
                t.decompose()
                continue
            attrs = {'src': local_img(src), 'alt': t.get('alt', '')}
            if t.get('width') and t.get('height'):
                attrs['width'], attrs['height'] = t['width'], t['height']
            t.attrs = attrs
        elif t.name == 'a':
            href = norm_url(t.get('href'))
            t.attrs = {'href': href} if href else {}
            if href and href.startswith('http') and 'smartsecc' not in href:
                t.attrs.update({'target': '_blank', 'rel': 'noopener'})
        elif t.name in ('td', 'th'):
            keep = {k: t[k] for k in ('colspan', 'rowspan') if t.get(k)}
            t.attrs = keep
        elif t.name in KEEP:
            t.attrs = {}
        else:
            t.unwrap()
    for t in node.find_all('span'):
        t.unwrap()
    for t in node.find_all('b'):
        t.name = 'strong'
    # drop empty paragraphs/headings (Elementor leaves lots of &nbsp; spacers)
    for t in node.find_all(['p', 'h2', 'h3', 'h4', 'h5', 'li', 'strong']):
        if not clean_text(t.get_text()).replace('\xa0', '') and not t.find('img'):
            t.decompose()
    html = str(node)
    html = re.sub(r'(&nbsp;|\xa0)+', ' ', html)
    html = re.sub(r'\n\s*\n+', '\n', html).strip()
    return html


def price_range(c):
    txt = clean_text(c.get_text(' '))
    nums = [int(n) for n in re.findall(r'(\d{3,5})', txt.replace(',', ''))]
    if len(nums) < 3:
        return None
    title = 'טווח מחירים'
    m = re.search(r'טווח מחירים\s*-\s*([^:]+?:)', txt)
    label = clean_text(m.group(1)).rstrip(':') if m else 'מחיר ממוצע'
    avg, low, high = (nums[0], nums[1], nums[2])
    return {'type': 'priceRange', 'title': title, 'label': label, 'avg': avg, 'low': low, 'high': high}


def callout(c):
    for t in c(['style', 'script', 'title', 'head']):
        t.decompose()
    blocks = []
    for t in c.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'div']):
        if t.find(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'div']):
            continue
        s = clean_text(t.get_text(' '))
        if s and s not in ('!', '⚠️', '💡') and s not in blocks:
            blocks.append(s)
    if not blocks:
        return None
    title = blocks[0]
    body = blocks[1:]
    # "הערה חשובה - <topic>" duplicates the visible heading that follows it
    if body and title.startswith('הערה חשובה') and body[0] == 'הערה חשובה':
        title = body.pop(0)
    return {'type': 'callout', 'title': title.strip(' :!'), 'items': body}


def html_widget(w):
    c = w.select_one('.elementor-widget-container') or w
    raw = str(c)
    txt = clean_text(BeautifulSoup(raw, 'html.parser').get_text(' '))
    if 'טווח מחירים' in txt[:40] and '₪' in txt:
        return price_range(c)
    if c.select('a') and len(c.select('a')) > 10:
        groups = []
        soup = BeautifulSoup(raw, 'html.parser')
        for sec in soup.select('.category-section') or [soup]:
            t = sec.select_one('.category-title, h2, h3')
            links = [{'href': norm_url(a.get('href')), 'text': clean_text(a.get_text(' '))} for a in sec.select('a')]
            groups.append({'title': clean_text(t.get_text(' ')) if t else '', 'links': links})
        return {'type': 'linkGroups', 'groups': groups}
    if c.select('table'):
        soup = BeautifulSoup(raw, 'html.parser')
        for t in soup(['style', 'script', 'title', 'head']):
            t.decompose()
        # keep every heading; the widget's own h1 becomes an h2 (the page has its own h1)
        title = ''
        for h in soup.find_all('h1'):
            h.name = 'h2'
        for d in soup.find_all('div'):
            if not d.find(['div', 'table', 'p', 'ul', 'h2', 'h3']) and clean_text(d.get_text()):
                d.name = 'p'
        return {'type': 'html', 'title': title, 'subtitle': '', 'html': sanitize(soup)}
    return callout(BeautifulSoup(raw, 'html.parser'))


def toggle(w):
    items = []
    for it in w.select('.elementor-toggle-item'):
        q = it.select_one('.elementor-tab-title')
        a = it.select_one('.elementor-tab-content')
        if q and a:
            items.append({'q': clean_text(q.get_text(' ')), 'a': sanitize(a.decode_contents())})
    return {'type': 'faq', 'items': items}


def image_widget(w):
    img = w.find('img')
    if not img:
        return None
    src = img_src(img)
    if not src or 'placeholder' in src:
        return None
    a = img.find_parent('a')
    cap = w.select_one('figcaption')
    return {'type': 'image', 'src': local_img(src), 'alt': img.get('alt', ''),
            'width': int(img['width']) if img.get('width', '').isdigit() else None,
            'height': int(img['height']) if img.get('height', '').isdigit() else None,
            'href': norm_url(a['href']) if a else None,
            'caption': clean_text(cap.get_text(' ')) if cap else ''}


def image_box(w):
    img = w.find('img')
    t = w.select_one('.elementor-image-box-title')
    d = w.select_one('.elementor-image-box-description')
    return {'type': 'imageBox', 'src': local_img(img_src(img)) if img else None, 'alt': img.get('alt', '') if img else '',
            'width': int(img['width']) if img and img.get('width', '').isdigit() else None,
            'height': int(img['height']) if img and img.get('height', '').isdigit() else None,
            'title': clean_text(t.get_text(' ')) if t else '', 'text': clean_text(d.get_text(' ')) if d else ''}


def parse_blocks(page):
    blocks = []
    for w in page.select('[data-widget_type]'):
        wt = w['data-widget_type'].split('.')[0]
        pw = w.find_parent(attrs={'data-widget_type': True})
        if pw is not None and page in pw.parents:
            continue
        b = None
        if wt == 'heading':
            h = w.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'], class_='elementor-heading-title') or w.find(['h1', 'h2', 'h3', 'h4'])
            if h and clean_text(h.get_text()):
                lvl = h.name if h.name in ('h2', 'h3', 'h4') else ('h2' if h.name in ('h1', 'h5', 'h6') else 'p')
                a = h.find('a')
                b = {'type': 'heading', 'level': lvl, 'text': clean_text(h.get_text(' ')),
                     'href': norm_url(a['href']) if a else None}
        elif wt == 'text-editor':
            html = sanitize((w.select_one('.elementor-widget-container') or w).decode_contents())
            if clean_text(BeautifulSoup(html, 'html.parser').get_text()):
                b = {'type': 'rich', 'html': html}
        elif wt == 'image':
            b = image_widget(w)
        elif wt == 'image-box':
            b = image_box(w)
        elif wt == 'toggle':
            b = toggle(w)
        elif wt == 'html':
            b = html_widget(w)
        elif wt == 'table-of-contents':
            b = {'type': 'toc'}
        if b:
            inside = [a for a in w.parents if a is not page and page in a.parents]
            par = next((a for a in inside if 'e-parent' in (a.get('class') or [])), None)
            child = next((a for a in inside if 'e-child' in (a.get('class') or [])), None)
            b['_sec'] = par.get('data-id') if par else None
            b['_col'] = child.get('data-id') if child else None
            blocks.append(b)
    return blocks


def head_meta(s):
    def meta(attr, key):
        t = s.find('meta', attrs={attr: key})
        return t['content'] if t and t.has_attr('content') else ''
    canon = s.find('link', rel='canonical')
    ld = []
    for t in s.find_all('script', type='application/ld+json'):
        try:
            ld.append(json.loads(t.string or ''))
        except Exception:
            pass
    dates = {}
    for g in ld:
        for n in g.get('@graph', []) if isinstance(g, dict) else []:
            if 'WebPage' in str(n.get('@type')):
                dates = {'published': n.get('datePublished'), 'modified': n.get('dateModified')}
    return {
        'title': clean_text(s.title.get_text()) if s.title else '',
        'description': meta('name', 'description'),
        'robots': meta('name', 'robots'),
        'canonical': norm_url(canon['href']) if canon else None,
        'ogTitle': meta('property', 'og:title'),
        'ogDescription': meta('property', 'og:description'),
        'ogImage': local_img(meta('property', 'og:image')) if meta('property', 'og:image') else '',
        'ogType': meta('property', 'og:type'),
        **dates,
    }


pages = []
for x in F:
    s = BeautifulSoup(open(x['file'], encoding='utf-8').read(), 'html.parser')
    hero = s.select_one('[data-elementor-type="single-page"]')
    h1 = hero.select_one('[data-widget_type="theme-page-title.default"] .elementor-heading-title') if hero else None
    sub = hero.select_one('[data-widget_type="text-editor.default"]') if hero else None
    page = s.select_one('[data-elementor-type="wp-page"]')
    body_cls = s.body.get('class', [])
    pid = next((int(c.split('-')[-1]) for c in body_cls if re.fullmatch(r'page-id-\d+', c)), None)
    path = '/' if x['path'] == 'index' else '/' + x['path'] + '/'
    rec = {'id': pid, 'path': path, 'slug': '' if x['path'] == 'index' else x['path'],
           'h1': clean_text(h1.get_text(' ')) if h1 else '',
           'subtitle': clean_text(sub.get_text(' ')) if sub else '',
           **head_meta(s), 'blocks': parse_blocks(page)}
    pages.append(rec)

# shared bits: logo, favicons, testimonials, header menu, footer, video, tips
s = BeautifulSoup(open([x for x in F if x['path'] == 'index'][0]['file'], encoding='utf-8').read(), 'html.parser')
for l in s.find_all('link', rel=lambda r: r and ('icon' in r or 'apple-touch-icon' in r)):
    local_img(l['href'])
hdr = s.select_one('[data-elementor-type="header"]')
logo = hdr.find('img') if hdr else None
shared = {'logo': {'src': local_img(img_src(logo)), 'alt': logo.get('alt', ''), 'width': logo.get('width'), 'height': logo.get('height')} if logo else None}
sec = s.select_one('[data-elementor-type="section"]')
shared['testimonials'] = []
for sl in sec.select('.elementor-testimonial'):
    im = sl.find('img')
    src = img_src(im) if im else ''
    shared['testimonials'].append({'text': clean_text(sl.select_one('.elementor-testimonial__text').get_text(' ')),
                                   'name': clean_text(sl.select_one('.elementor-testimonial__name').get_text(' ')),
                                   'img': local_img(src) if src and 'placeholder' not in src else None})
v = sec.select_one('[data-widget_type="video.default"]')
shared['video'] = json.loads(v['data-settings']).get('youtube_url') if v else None
tips = re.search(r'const tips = (\[.*?\]);', str(sec), re.S)
shared['tips'] = json.loads(tips.group(1)) if tips else []
shared['sectionLists'] = []
for il in sec.select('[data-widget_type="icon-list.default"]'):
    shared['sectionLists'].append([{'text': clean_text(a.get_text(' ')), 'href': norm_url(a.get('href'))} for a in il.select('a')])
shared['sectionButtons'] = [{'text': clean_text(a.get_text(' ')), 'href': norm_url(a.get('href'))} for a in sec.select('[data-widget_type="button.default"] a')]
shared['sectionHeadings'] = [clean_text(h.get_text(' ')) for h in sec.select('.elementor-heading-title')]
ftr = s.select_one('[data-elementor-type="footer"]')
shared['footer'] = []
for h in ftr.select('[data-widget_type="heading.default"]'):
    col = h.find_parent(class_='e-con') or h.parent
    nxt = h.find_next(attrs={'data-widget_type': 'text-editor.default'})
    shared['footer'].append({'title': clean_text(h.get_text(' ')),
                             'links': [{'text': clean_text(a.get_text(' ')), 'href': norm_url(a.get('href'))} for a in nxt.select('a')] if nxt else [],
                             'text': clean_text(nxt.get_text(' ')) if nxt else ''})
nav = hdr.select_one('nav')
shared['menu'] = []
for li in nav.select(':scope > ul > li'):
    a = li.find('a')
    item = {'text': clean_text(a.get_text(' ')), 'href': norm_url(a.get('href')), 'children': []}
    sub = li.find('ul')
    if sub:
        item['children'] = [{'text': clean_text(x.get_text(' ')), 'href': norm_url(x.get('href'))} for x in sub.select('a')]
    shared['menu'].append(item)
shared['ldjson'] = [json.loads(t.string) for t in s.find_all('script', type='application/ld+json') if t.string and t.string.strip().startswith('{"@context":"https://schema.org","@graph"')]

json.dump(pages, open('pages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(shared, open('shared.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(sorted(IMAGES), open('images.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('pages', len(pages), 'images', len(IMAGES))
