// Edge-safe (Web Crypto) signed session token, used by middleware and route handlers.
export type Session = { uid: string; name: string; role: 'admin' | 'marketing' | 'cs'; exp: number };
export const COOKIE = 'cbn_admin';

const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// SESSION_SECRET, or derived from DATABASE_URL (a secret already) so a deploy needs only one variable.
const key = async () => {
  const s = process.env.SESSION_SECRET ?? '';
  const raw = s.length >= 32 ? enc.encode(s)
    : process.env.DATABASE_URL ? await crypto.subtle.digest('SHA-256', enc.encode('cbn-session:' + process.env.DATABASE_URL))
    : null;
  if (!raw) throw new Error('Set SESSION_SECRET (32+ chars) or DATABASE_URL');
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
};

export async function sign(s: Session) {
  const body = b64u(enc.encode(JSON.stringify(s)));
  return body + '.' + b64u(await crypto.subtle.sign('HMAC', await key(), enc.encode(body)));
}

export async function verify(token?: string): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await key(), unb64u(sig), enc.encode(body)))) return null;
    const s = JSON.parse(new TextDecoder().decode(unb64u(body))) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}
