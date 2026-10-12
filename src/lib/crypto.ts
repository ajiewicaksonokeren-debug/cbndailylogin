import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const dataKey = () => {
  const k = Buffer.from(process.env.DATA_KEY ?? '', 'base64');
  if (k.length === 32) return k;
  // Fallback: derived from DATABASE_URL. Changing the DB password then requires re-entering the integration secret.
  if (process.env.DATABASE_URL) return createHash('sha256').update('cbn-data:' + process.env.DATABASE_URL).digest();
  if (k.length !== 32) throw new Error('DATA_KEY must be 32 bytes base64');
  return k;
};

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', dataKey(), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map(b => b.toString('base64')).join('.');
}

export function decrypt(enc: string) {
  const [iv, tag, body] = enc.split('.').map(s => Buffer.from(s, 'base64'));
  const d = createDecipheriv('aes-256-gcm', dataKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString('utf8');
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return salt.toString('base64') + '.' + scryptSync(pw, salt, 32).toString('base64');
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split('.').map(s => Buffer.from(s, 'base64'));
  return timingSafeEqual(scryptSync(pw, salt, 32), hash);
}
