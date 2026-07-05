// Shared pagination logic for the section listing pages (blog, poetry,
// research, projects, videos). Page size is editable from the CMS
// (Site Settings → General → "Posts per page"); we clamp to a sane range so a
// bad value can't produce zero-size pages or absurd counts.
import general from '../data/general.json';

const rawPerPage = Number((general as { postsPerPage?: number }).postsPerPage);
export const POSTS_PER_PAGE =
  Number.isFinite(rawPerPage) && rawPerPage >= 1
    ? Math.min(Math.floor(rawPerPage), 48)
    : 9;

// Slice `items` for a given 1-based page number.
export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE) {
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Math.floor(page)), lastPage);
  const slice = items.slice((current - 1) * perPage, current * perPage);
  return { slice, current, lastPage };
}

// The extra page numbers (2..last) that need their own /page/N route.
// Page 1 is always the section's index.astro, so it's excluded here.
export function extraPageNumbers(itemCount: number, perPage = POSTS_PER_PAGE): number[] {
  const lastPage = Math.max(1, Math.ceil(itemCount / perPage));
  const out: number[] = [];
  for (let p = 2; p <= lastPage; p++) out.push(p);
  return out;
}
