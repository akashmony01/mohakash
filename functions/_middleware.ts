// Cloudflare Pages middleware — runs in front of every request.
//
// Canonicalize the whole site on https://mohakash.xyz with permanent redirects:
//   - The Cloudflare-provided *.pages.dev URL can't be disabled, so 301 the
//     production subdomain to the real domain (kills duplicate-content/SEO).
//   - Send www → apex so there's one canonical host.
// Anything on mohakash.xyz passes straight through to the static site / Functions.

const CANONICAL_HOST = 'mohakash.xyz';
const REDIRECT_HOSTS = new Set(['mohakash.pages.dev', 'www.mohakash.xyz']);

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);

  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
