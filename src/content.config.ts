import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    /** Describes the hero image for screen readers. Empty means decorative. */
    heroImageAlt: z.string().default(''),
    /**
     * Photographer credit. Required by the Unsplash API guidelines for any
     * image sourced through their API, and good manners for the rest.
     */
    heroCredit: z
      .object({
        name: z.string(),
        /** The photographer's profile page. */
        profile: z.string().url(),
        /** The photo's own page. */
        photo: z.string().url(),
        source: z.string().default('Unsplash'),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
