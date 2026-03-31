import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { generateAgentReply, type ChatTurn } from '@/lib/ai-orchestrator';
import { writeLog } from '@/app/api/admin/logs/route';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = String(body?.message ?? '').trim();
    const agent = body?.agent ?? {};
    const historyRaw = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    const history: ChatTurn[] = historyRaw
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content }))
      .slice(-12);

    const db = await getDb();
    const result = await generateAgentReply({
      db,
      workspaceId: session.workspaceId,
      agent,
      message,
      history,
    });

    for (const at of result.attempts ?? []) {
      if (at.status === 'error') {
        await writeLog({
          level: at.isQuotaOrTokens ? 'error' : 'warn',
          source: 'agent-preview',
          msg: `Intento fallido ${at.provider}/${at.model}`,
          detail: at.reason ?? 'error',
        });
      }
    }

    if (result.fallbackUsed || (Array.isArray(result.errors) && result.errors.length > 0)) {
      await writeLog({
        level: 'warn',
        source: 'agent-preview',
        msg: `Preview con degradacion (${result.fallbackType ?? 'none'})`,
        detail: (result.errors ?? []).slice(-4).join(' | '),
      });
    }

    await writeLog({
      level: 'info',
      source: 'agent-preview',
      msg: 'Preview IA generado',
      detail: `${result.provider}/${result.model}`,
    });

    return Response.json(result);
  } catch (e: any) {
    await writeLog({
      level: 'error',
      source: 'agent-preview',
      msg: 'Error en preview IA',
      detail: e?.message ?? 'unknown',
    }).catch(() => {});

    return Response.json({ error: e?.message ?? 'Error interno' }, { status: 500 });
  }
}
