import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const db = await getDb();
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
    return Response.json(users.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, name, role } = await req.json();
    if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email });
    if (existing) return Response.json({ error: 'Este usuario ya existe' }, { status: 409 });

    await db.collection('users').insertOne({
      email: email.trim().toLowerCase(),
      name: name?.trim() ?? email.split('@')[0],
      role: role ?? 'viewer',
      createdAt: Date.now(),
      lastLogin: null,
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const { email } = await req.json();
    if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });
    if (email === session?.sub) {
      return Response.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection('users').deleteOne({ email });
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
