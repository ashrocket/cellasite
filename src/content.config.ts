import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'zod';

const imageRef = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase kebab-case'),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

const externalLink = z.object({
  label: z.string(),
  url: z.string().url(),
});

const pressQuote = z.object({
  quote: z.string(),
  source: z.string(),
  author: z.string().optional(),
  url: z.string().url().optional(),
});

const subSection = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string(),
  description: z.string().optional(),
  images: z.array(imageRef).default([]),
  artists: z.array(z.string()).default([]),
});

const projectSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  category: z.enum(['label-design', 'narrative', 'interaction-design', 'other']),
  years: z.array(z.number().int().min(2000).max(2100)).min(1),
  role: z.string(),
  artists: z.array(z.string()).default([]),
  tagline: z.string().optional(),
  description: z.string(),
  thumbnail: imageRef,
  hero: imageRef.optional(),
  subSections: z.array(subSection).default([]),
  pressQuotes: z.array(pressQuote).default([]),
  links: z.array(externalLink).default([]),
  order: z.number().int().default(100),
});

const graphicSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  category: z.enum([
    'tour-poster',
    'merch',
    'show-poster',
    'typography',
    'radio-poster',
    'promo',
    'flyer',
    'campaign',
    'other',
  ]),
  year: z.number().int().min(2000).max(2100).optional(),
  artist: z.string().optional(),
  venue: z.string().optional(),
  description: z.string().optional(),
  image: imageRef,
  pressQuotes: z.array(pressQuote).default([]),
  links: z.array(externalLink).default([]),
  order: z.number().int().default(100),
});

const videoSchema = z
  .object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    year: z.number().int().min(2000).max(2100),
    role: z.string(),
    artist: z.string().optional(),
    description: z.string().optional(),
    thumbnail: imageRef,
    embedUrl: z.string().url().optional(),
    videoFile: z.string().optional(),
    embedProvider: z.enum(['vimeo', 'youtube', 'vevo']).optional(),
    links: z.array(externalLink).default([]),
    order: z.number().int().default(100),
  })
  .refine((v) => (v.embedUrl ? 1 : 0) + (v.videoFile ? 1 : 0) === 1, {
    message: 'Exactly one of embedUrl or videoFile must be set',
    path: ['embedUrl'],
  })
  .refine((v) => !v.embedUrl || !!v.embedProvider, {
    message: 'embedProvider is required when embedUrl is set',
    path: ['embedProvider'],
  });

const aboutSchema = z.object({
  slug: z.literal('about'),
  bio: z.array(z.string()).min(1),
  contact: z.object({
    email: z.string().email(),
    instagram: z.string(),
    instagramUrl: z.string().url(),
  }),
  software: z.object({
    proficient: z.array(z.string()),
    learning: z.array(z.string()),
  }),
  opennessStatement: z.string(),
  portrait: imageRef.optional(),
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
  about: defineCollection({
    loader: file('src/content/about.json'),
    schema: aboutSchema,
  }),
};

export type ImageRef = z.infer<typeof imageRef>;
export type ProjectEntry = z.infer<typeof projectSchema>;
export type GraphicEntry = z.infer<typeof graphicSchema>;
export type VideoEntry = z.infer<typeof videoSchema>;
export type AboutEntry = z.infer<typeof aboutSchema>;
