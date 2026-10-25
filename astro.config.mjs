import { defineConfig } from 'astro/config';

// URLs must stay byte-identical to the WordPress site (Hebrew slugs + trailing slash)
export default defineConfig({
  site: 'https://smartsecc.co.il',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  // internal links are fetched on hover/touch so the next page opens instantly
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
