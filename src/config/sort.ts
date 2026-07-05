// Shared list comparators. Imported (not defined inline) so they're usable
// inside Astro's getStaticPaths(), which runs in an isolated scope and can't
// see other top-level frontmatter variables.
type Dated = { data: { date: Date } };
type Ordered = { data: { order: number; year?: number; date: Date } };

export const byDateDesc = (a: Dated, b: Dated) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export const byProjectOrder = (a: { data: { order: number; year?: number } }, b: { data: { order: number; year?: number } }) =>
  a.data.order - b.data.order || (b.data.year ?? 0) - (a.data.year ?? 0);

export const byVideoOrder = (a: Ordered, b: Ordered) =>
  a.data.order - b.data.order || b.data.date.valueOf() - a.data.date.valueOf();
