// Cloudflare Pages Function — POST /api/subscribe
//
// Newsletter signup proxy. Takes { email } from the site's Newsletter form and
// subscribes it to a Kit (ConvertKit) form, keeping the API key server-side.
// Kit handles storage + the double opt-in confirmation email.
//
// Environment variables (Pages → Settings → Environment variables):
//   KIT_API_KEY   (secret)   Kit "API Key" (Settings → Advanced → API)
//   KIT_FORM_ID   (plain)    the numeric id of the Kit form to subscribe to

interface Env {
  KIT_API_KEY: string;
  KIT_FORM_ID: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const email = (body?.email ?? '').trim();
  if (!email || !email.includes('@')) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  if (!env.KIT_API_KEY || !env.KIT_FORM_ID) {
    return json({ error: 'The newsletter is not configured yet.' }, 500);
  }

  const res = await fetch(`https://api.convertkit.com/v3/forms/${env.KIT_FORM_ID}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.KIT_API_KEY, email }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'Could not subscribe right now. Please try again.', detail }, 502);
  }

  return json({ ok: true });
}
