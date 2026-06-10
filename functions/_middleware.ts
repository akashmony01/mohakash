// Cloudflare Pages middleware — runs in front of every request.
//
// Canonicalize the whole site on https://mohakash.xyz with permanent redirects:
//   - EVERY *.pages.dev URL (the production subdomain AND the per-deployment
//     <hash>.mohakash.pages.dev build URLs) → the real domain. Cloudflare can't
//     disable these, so we redirect them all to avoid confusing duplicate URLs
//     and duplicate-content/SEO. Rollback is still done from the dashboard.
//   - Send www → apex so there's one canonical host.
// Anything on mohakash.xyz passes straight through to the static site / Functions.

const CANONICAL_HOST = 'mohakash.xyz';

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  if (host.endsWith('.pages.dev') || host === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
