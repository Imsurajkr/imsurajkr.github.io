// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs';

export const SITE = 'https://surajkr.dev';

/**
 * Real publication dates for the blog, read straight from the post frontmatter
 * so the sitemap can carry an honest `lastmod`. Pages whose age we cannot
 * establish get no lastmod at all — a made-up date is worse than none, because
 * crawlers stop trusting the signal once it turns out to be the build time on
 * every URL.
 */
function blogDates() {
  const dir = './src/content/blog';
  /** @type {Record<string, string>} */
  const dates = {};

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const updated = /^updatedDate:\s*"?([0-9-]+)"?/m.exec(source);
    const published = /^pubDate:\s*"?([0-9-]+)"?/m.exec(source);
    const stamp = updated?.[1] ?? published?.[1];
    if (stamp) dates[`${SITE}/blog/${file.replace(/\.mdx?$/, '')}`] = new Date(stamp).toISOString();
  }

  return dates;
}

const BLOG_DATES = blogDates();

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
        const url = item.url.replace(/\/$/, '');

        if (item.url === `${SITE}/`) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/tools')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (item.url.includes('/incident-room')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (item.url.includes('/blog')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }

        if (BLOG_DATES[url]) item.lastmod = BLOG_DATES[url];
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
