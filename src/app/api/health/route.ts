// Deployment self-check: which settings are present (never their values) and whether the DB answers.
import { NextResponse } from 'next/server';
import { demoTokensAllowed } from '@/lib/appAuth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try { host = new URL(url).hostname; } catch {}
  const env = {
    DATABASE_URL: !!url,
    DATABASE_URL_host: host || null, // host only, no credentials
    SESSION_SECRET: (process.env.SESSION_SECRET ?? '').length >= 32,
    DATA_KEY: Buffer.from(process.env.DATA_KEY ?? '', 'base64').length === 32,
    APP_AUTH_MODE: process.env.APP_AUTH_MODE ?? null,
    demo_token_allowed: demoTokensAllowed(),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  };
  let database: string;
  try {
    const [r] = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int n FROM "AdminUser"`;
    database = `ok (${r.n} admin)`;
  } catch (e) {
    database = 'ERROR: ' + (e as Error).message.split('\n').filter(Boolean).slice(-2).join(' ').replace(/:\/\/[^@\s]*@/g, '://***@').slice(0, 300);
  }
  return NextResponse.json({ env, database }, { headers: { 'Cache-Control': 'no-store' } });
}
