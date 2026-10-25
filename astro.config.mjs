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
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
