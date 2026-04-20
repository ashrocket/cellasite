import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const projectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  category: z.string().optional(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

const graphicSchema = z.object({
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

const videoSchema = z.object({
  title: z.string(),
  slug: z.string(),
  year: z.number().optional(),
  role: z.string().optional(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const collections = {
  projects: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  graphics: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/graphics' }),
    schema: graphicSchema,
  }),
  videos: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/videos' }),
    schema: videoSchema,
  }),
};
