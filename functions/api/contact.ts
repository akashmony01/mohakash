// Cloudflare Pages Function — POST /api/contact
//
// Receives the contact form, verifies the Cloudflare Turnstile token (anti-spam),
// then emails the message to you via Resend. Lives outside the Astro build:
// Cloudflare Pages auto-deploys anything under /functions as serverless routes.
//
// Environment variables (Pages → Settings → Environment variables):
//   RESEND_API_KEY        (secret)   Resend API key, starts with "re_"
//   TURNSTILE_SECRET_KEY  (secret)   Turnstile secret key
//   CONTACT_TO_EMAIL      (plain)    where messages are delivered (your inbox)
//   CONTACT_FROM_EMAIL    (plain)    verified sender, e.g. "Site <hi@mohakash.xyz>".
//                                    Optional — falls back to Resend's test sender
//                                    (onboarding@resend.dev) until the domain is verified.

interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_FROM_EMAIL?: string;
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

  const { name, email, message, company, token } = body ?? {};

  // Honeypot: real users never fill the hidden "company" field. Silently accept.
  if (company) return json({ ok: true });

  if (!name || !email || !message) {
    return json({ error: 'Please fill in your name, email, and message.' }, 400);
  }

  // 1. Verify the Turnstile token with Cloudflare.
  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    return json({ error: 'The contact form is not fully configured yet.' }, 500);
  }
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token ?? '',
      remoteip: ip,
    }),
  });
  const verify = (await verifyRes.json()) as { success: boolean };
  if (!verify.success) {
    return json({ error: 'Anti-spam check failed — please try again.' }, 400);
  }

  // 2. Send the email via Resend.
  const from = env.CONTACT_FROM_EMAIL || 'mohakash.xyz <onboarding@resend.dev>';
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: `${name} <${email}>`,
      subject: `New message from ${name} — mohakash.xyz`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!sendRes.ok) {
    const detail = await sendRes.text();
    return json({ error: 'Could not send your message. Please email me directly.', detail }, 502);
  }

  return json({ ok: true });
}
