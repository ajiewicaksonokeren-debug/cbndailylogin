// Deployment self-check: which settings are present (never their values) and whether the DB answers.
// If the Supabase pooler host is wrong, it tries the other cluster (aws-0 / aws-1) and says which to use.
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authMode, demoTokensOn } from '@/lib/appAuth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const clean = (e: unknown) =>
  (e as Error).message.split('\n').filter(Boolean).slice(-2).join(' ').replace(/:\/\/[^@\s]*@/g, '://***@').slice(0, 300);

async function probe(client: PrismaClient) {
  const [r] = await client.$queryRaw<{ n: number }[]>`SELECT count(*)::int n FROM "AdminUser"`;
  return r.n;
}

export async function GET() {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try { host = new URL(url).hostname; } catch {}
  const env = {
    DATABASE_URL: !!url,
    DATABASE_URL_host: host || null, // host only, no credentials
    SESSION_SECRET: (process.env.SESSION_SECRET ?? '').length >= 32 ? 'set' : url ? 'derived from DATABASE_URL' : 'MISSING',
    DATA_KEY: Buffer.from(process.env.DATA_KEY ?? '', 'base64').length === 32 ? 'set' : url ? 'derived from DATABASE_URL' : 'MISSING',
    auth_mode: authMode(),
    demo_token: demoTokensOn(),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  };
  if (!url) return NextResponse.json({ env, database: 'ERROR: DATABASE_URL belum diisi di Vercel' }, { headers: { 'Cache-Control': 'no-store' } });
  let database: string, fix: string | null = null;
  try {
    database = `ok (${await probe(db)} admin)`;
  } catch (e) {
    database = 'ERROR: ' + clean(e);
    const m = host.match(/^aws-(\d)-(.+\.pooler\.supabase\.com)$/);
    if (m) {
      const altHost = `aws-${m[1] === '0' ? '1' : '0'}-${m[2]}`;
      const alt = new PrismaClient({ datasourceUrl: url.replace(host, altHost) });
      try { await probe(alt); fix = `Ganti host di DATABASE_URL jadi ${altHost}, lalu Redeploy.`; } catch {} finally { await alt.$disconnect(); }
    }
  }
  return NextResponse.json({ env, database, fix }, { headers: { 'Cache-Control': 'no-store' } });
}
