import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await db.asset.findUnique({ where: { id: (await params).id } });
  if (!a) return new Response('Not found', { status: 404 });
  return new Response(a.data, { headers: { 'Content-Type': a.mime, 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
