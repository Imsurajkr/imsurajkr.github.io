import { toString } from 'mdast-util-to-string';

const WORDS_PER_MINUTE = 200;

/**
 * Exposes `minutesRead` on each post's frontmatter, available in Astro via
 * the `remarkPluginFrontmatter` returned from `render()`.
 */
export function remarkReadingTime() {
  return function (tree, file) {
    const words = toString(tree).split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
    file.data.astro.frontmatter.minutesRead = `${minutes} min read`;
    file.data.astro.frontmatter.wordCount = words;
  };
}
