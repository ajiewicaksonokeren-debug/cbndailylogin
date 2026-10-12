// Resolves customer_id from the CBN app session token. customer_id is never accepted from the client.
export async function customerFromRequest(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  if (authMode() === 'mock') {
    if (!demoTokensAllowed()) throw new Error('APP_AUTH_MODE=mock needs dev, Vercel preview, or ALLOW_DEMO_TOKEN=true');
    return /^\d{6,10}$/.test(token) ? token : null;
  }
  const url = process.env.CBN_AUTH_VERIFY_URL;
  if (!url) throw new Error('CBN_AUTH_VERIFY_URL is not set');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(3000) });
  if (!r.ok) return null;
  const j = (await r.json()) as { customer_id?: string | number };
  return j.customer_id != null ? String(j.customer_id) : null;
}

/** Until the real CBN auth endpoint is configured the app runs in demo mode (token = customer_id). */
export const authMode = () => process.env.APP_AUTH_MODE ?? (process.env.CBN_AUTH_VERIFY_URL ? 'cbn' : 'mock');
/** Demo tokens: dev, Vercel preview, ALLOW_DEMO_TOKEN=true, or no CBN auth configured yet. Admin shows a red badge. */
export const demoTokensAllowed = () =>
  process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_DEMO_TOKEN === 'true' || !process.env.CBN_AUTH_VERIFY_URL;
export const demoTokensOn = () => authMode() === 'mock' && demoTokensAllowed();

export const deviceOf = (req: Request) => {
  const h = req.headers.get('x-device') ?? req.headers.get('user-agent') ?? '';
  return /iphone|ipad|ios/i.test(h) ? 'iOS' : /android/i.test(h) ? 'Android' : 'Lainnya';
};
