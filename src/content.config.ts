import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// CMS-friendly optionals: Keystatic writes empty fields as "" or null, so
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
  }),
});

const poetry = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/poetry' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    note: optionalString,
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
  }),
});

export const collections = { projects, poetry, research, blog };
