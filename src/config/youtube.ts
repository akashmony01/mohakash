// Accept a full YouTube URL (watch?v=, youtu.be/, /shorts/, /embed/) or a bare
// 11-character video ID, and return a normalized ID / privacy-friendly embed URL.
export function youtubeId(input: string): string | null {
  const v = (input ?? '').trim();
  if (!v) return null;
  if (/^[\w-]{11}$/.test(v)) return v; // already a bare ID
  try {
    const url = new URL(v);
    if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1).slice(0, 11) || null;
    const q = url.searchParams.get('v');
    if (q) return q;
    const m = url.pathname.match(/\/(?:embed|shorts|v)\/([\w-]{11})/);
    if (m) return m[1];
  } catch {
    // not a URL — fall through
  }
  return null;
}

// nocookie domain = no tracking cookies until the viewer actually plays.
export function youtubeEmbed(input: string): string | null {
  const id = youtubeId(input);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
