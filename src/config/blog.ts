// Blog categories, shared by the index, the category-filter links, and the
// /blog/topic/<slug> routes. The slug is what appears in the URL; the label is
// the value stored in each post's `category` frontmatter (and shown on chips).
export const BLOG_CATEGORIES = [
  { label: 'Building with Claude', slug: 'building-with-claude' },
  { label: 'Notes', slug: 'notes' },
  { label: 'Dev', slug: 'dev' },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export function categoryBySlug(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}
