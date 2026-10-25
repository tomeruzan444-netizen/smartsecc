import manifestData from '../data/image-manifest.json';

type Entry = { width: number; height: number; variants: { w: number; url: string }[] };
const manifest = manifestData as Record<string, Entry>;

/** Responsive WebP attributes for a /wp-content/uploads image; falls back to the original file. */
export function imgAttrs(src: string, sizes = '(max-width: 768px) 100vw, 720px') {
  const m = manifest[src];
  if (!m) return { src, width: undefined, height: undefined, srcset: undefined, sizes: undefined };
  const largest = m.variants[m.variants.length - 1];
  const pick = m.variants.find((v) => v.w >= 1024) ?? largest;
  return {
    src: pick.url,
    srcset: m.variants.map((v) => `${v.url} ${v.w}w`).join(', '),
    sizes,
    width: m.width,
    height: m.height,
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Rewrite <img> tags inside migrated rich-text HTML to lazy, responsive WebP images. */
export function enhanceHtml(html: string) {
  return html.replace(/<img\b([^>]*?)\/?>/g, (_m, attrs: string) => {
    const src = /src="([^"]+)"/.exec(attrs)?.[1] ?? '';
    const alt = /alt="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const a = imgAttrs(src.replace(/&amp;/g, '&'));
    const parts = [`src="${esc(a.src)}"`, `alt="${alt}"`, 'loading="lazy"', 'decoding="async"'];
    if (a.srcset) parts.push(`srcset="${esc(a.srcset)}"`, `sizes="${a.sizes}"`);
    if (a.width) parts.push(`width="${a.width}"`, `height="${a.height}"`);
    return `<img ${parts.join(' ')}>`;
  }).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
}
