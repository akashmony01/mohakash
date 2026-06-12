import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// CMS-friendly optionals: the CMS may write empty fields as "" or null, so
// normalize those to undefined before validating.
const optionalString = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().optional(),
);
const optionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().url().optional(),
);
const optionalNumber = z.preprocess(
  (v) => (v == null ? undefined : v),
  z.number().optional(),
);

// A downloadable file or external link attached to a post (PDF, slides,
// dataset, demo, etc.). `href` can be an external URL or a path under
// /uploads (e.g. "/uploads/my-paper.pdf").
const resource = z.object({
  label: z.string(),
  href: z.string(),
  kind: z.enum(['link', 'pdf', 'code', 'live', 'doc']).default('link'),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    stack: z.array(z.string()).default([]),
    year: optionalNumber,
    link: optionalUrl,
    repo: optionalUrl,
    featured: z.boolean().default(false),
    order: z.number().default(0),
    cover: optionalString,
    resources: z.array(resource).default([]),
    hidden: z.boolean().default(false),
  }),
});

const poetry = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/poetry' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    note: optionalString,
    hidden: z.boolean().default(false),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['paper', 'note', 'project']).default('note'),
    abstract: optionalString,
    pdf: optionalString,
    link: optionalUrl,
    cover: optionalString,
    resources: z.array(resource).default([]),
    hidden: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['Building with Claude', 'Notes', 'Dev']).default('Notes'),
    excerpt: z.string(),
    draft: z.boolean().default(false),
    cover: optionalString,
    resources: z.array(resource).default([]),
    hidden: z.boolean().default(false),
  }),
});

// Videos: each entry embeds one YouTube video (paste its link). The channel
// info shown in the page hero lives in src/data/pages.json → videos.
const videos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/videos' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    youtube: z.string(), // full YouTube URL or bare video ID
    description: optionalString,
    order: z.number().default(0),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { projects, poetry, research, blog, videos };
