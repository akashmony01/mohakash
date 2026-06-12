// Section-level show/hide, toggled from the CMS
// (src/data/visibility.json → Site Settings → "Visibility").
// A section turned off is removed from the nav, the homepage "Recent work"
// cards, the RSS feed, and its own pages — the content files stay untouched in
// the repo, so flipping it back on restores everything.
import visibility from '../data/visibility.json';

export const SECTIONS = ['projects', 'poetry', 'research', 'blog', 'videos'] as const;
export type Section = (typeof SECTIONS)[number];

export function isSectionVisible(section: Section): boolean {
  return (visibility as Record<string, boolean>)[section] !== false;
}

// Map an href like "/blog", "/poetry/foo", or "/research#x" to its section key.
export function hrefSection(href: string): Section | null {
  for (const s of SECTIONS) {
    if (href === `/${s}` || href.startsWith(`/${s}/`) || href.startsWith(`/${s}#`)) {
      return s;
    }
  }
  return null;
}

// Drop nav links that point at a hidden section (non-section links pass through).
export function visibleNav<T extends { href: string }>(links: T[]): T[] {
  return links.filter((l) => {
    const s = hrefSection(l.href);
    return !s || isSectionVisible(s);
  });
}
