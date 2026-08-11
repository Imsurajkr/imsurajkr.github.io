// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs';

export const SITE = 'https://surajkr.dev';

export default defineConfig({
  site: SITE,
  // Custom apex domain (surajkr.dev) serves from the root.
  base: '/',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      /** @param {any} item */
      serialize(item) {
        if (item.url === `${SITE}/`) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/tools')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (item.url.includes('/blog')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  build: {
    // Emit /blog/foo.html rather than /blog/foo/index.html so the Jekyll
    // permalinks (/blog/:title) keep resolving on GitHub Pages.
    format: 'file',
  },
});
