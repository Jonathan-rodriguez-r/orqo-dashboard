import { cookies } from 'next/headers';
import { ACTIVE_WORKSPACE_COOKIE, COOKIE } from '@/lib/auth';

export async function POST() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(ACTIVE_WORKSPACE_COOKIE);
  return Response.json({ ok: true });
}
