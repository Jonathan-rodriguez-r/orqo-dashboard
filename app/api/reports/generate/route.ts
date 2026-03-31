import { getDb } from '@/lib/mongodb';
import { generateAgentReply, type AgentRuntime } from '@/lib/ai-orchestrator';
import { writeLog } from '@/app/api/admin/logs/route';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type ReportFormat = 'json' | 'xlsx' | 'pdf';

function safeDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toDayKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseDataUrl(url: string) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(url);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), bytes: Buffer.from(m[2], 'base64') };
}

async function readLogoBytes(urlRaw: string) {
  const url = String(urlRaw || '').trim();
  if (!url) return null;
  const data = parseDataUrl(url);
  if (data) return data;
  if (!/^https?:\/\//i.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  const mime = String(res.headers.get('content-type') || '').toLowerCase();
  if (mime.includes('png')) return { mime: 'image/png', bytes };
  if (mime.includes('jpeg') || mime.includes('jpg')) return { mime: 'image/jpeg', bytes };
  return null;
}

function writeWrappedLines(args: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: any;
  fontSize: number;
  lineHeight: number;
}) {
  const words = String(args.text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (args.font.widthOfTextAtSize(candidate, args.fontSize) > args.maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  let y = args.y;
  for (const row of lines) {
    args.page.drawText(row, { x: args.x, y, size: args.fontSize, font: args.font, color: rgb(0.11, 0.16, 0.13) });
    y -= args.lineHeight;
  }
  return y;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const format: ReportFormat = ['xlsx', 'pdf'].includes(String(body?.format)) ? body.format : 'json';
    const days = Math.max(1, Math.min(365, Number(body?.days ?? 30)));
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - days + 1);
    defaultFrom.setHours(0, 0, 0, 0);
    const from = safeDate(body?.from, defaultFrom);
    const to = safeDate(body?.to, now);
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const fromStr = toDayKey(fromMs);
    const toStr = toDayKey(toMs);

    const db = await getDb();
    const [account, dailyRows, byChannelRows, byModelRows, byStatusRows, feedbackRows] = await Promise.all([
      db.collection('config').findOne({ _id: 'account' as any }),
      db.collection('analytics_daily').find({ date: { $gte: fromStr, $lte: toStr } }).sort({ date: 1 }).toArray(),
      db.collection('conversations').aggregate([
        { $match: { updatedAt: { $gte: fromMs, $lte: toMs } } },
        { $group: { _id: '$channel', count: { $sum: 1 }, tokens: { $sum: '$tokens.total' } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection('conversations').aggregate([
        { $match: { updatedAt: { $gte: fromMs, $lte: toMs } } },
        { $group: { _id: { provider: '$model_provider', model: '$model' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection('conversations').aggregate([
        { $match: { updatedAt: { $gte: fromMs, $lte: toMs } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
      db.collection('conversations').aggregate([
        { $match: { updatedAt: { $gte: fromMs, $lte: toMs } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            helpfulYes: { $sum: { $cond: [{ $eq: ['$feedback.helpful', true] }, 1, 0] } },
            helpfulNo: { $sum: { $cond: [{ $eq: ['$feedback.helpful', false] }, 1, 0] } },
            feedbackResponses: { $sum: { $cond: [{ $in: ['$feedback.helpful', [true, false]] }, 1, 0] } },
            autoClosed: { $sum: { $cond: [{ $eq: ['$closureReason', 'inactivity_timeout'] }, 1, 0] } },
            tokenTotal: { $sum: '$tokens.total' },
          },
        },
      ]).toArray(),
    ]);

    const totalsDaily = dailyRows.reduce(
      (acc, row: any) => {
        acc.conversations += Number(row?.conversations ?? 0);
        acc.resolved += Number(row?.resolved ?? 0);
        acc.escalated += Number(row?.escalated ?? 0);
        return acc;
      },
      { conversations: 0, resolved: 0, escalated: 0 }
    );
    const fb = feedbackRows[0] ?? {};
    const feedbackResponses = Number(fb.feedbackResponses ?? 0);
    const helpfulYes = Number(fb.helpfulYes ?? 0);
    const helpfulNo = Number(fb.helpfulNo ?? 0);
    const satisfaction = feedbackResponses > 0 ? Math.round((helpfulYes / feedbackResponses) * 100) : 0;

    const reportData = {
      period: { from: fromStr, to: toStr, days },
      business: {
        name: String(account?.business_name || 'Cuenta ORQO'),
        plan: String(account?.plan || 'Starter'),
      },
      totals: {
        conversations: totalsDaily.conversations,
        resolved: totalsDaily.resolved,
        escalated: totalsDaily.escalated,
        resolutionRate:
          totalsDaily.conversations > 0 ? Math.round((totalsDaily.resolved / totalsDaily.conversations) * 100) : 0,
        helpfulYes,
        helpfulNo,
        feedbackResponses,
        satisfactionRate: satisfaction,
        autoClosedByInactivity: Number(fb.autoClosed ?? 0),
        tokensTotal: Number(fb.tokenTotal ?? 0),
      },
      channels: byChannelRows.map((r: any) => ({
        channel: String(r?._id ?? 'unknown'),
        count: Number(r?.count ?? 0),
        tokens: Number(r?.tokens ?? 0),
      })),
      models: byModelRows.map((r: any) => ({
        provider: String(r?._id?.provider ?? ''),
        model: String(r?._id?.model ?? ''),
        count: Number(r?.count ?? 0),
      })),
      statuses: byStatusRows.map((r: any) => ({
        status: String(r?._id ?? 'unknown'),
        count: Number(r?.count ?? 0),
      })),
      daily: dailyRows.map((r: any) => ({
        date: String(r?.date ?? ''),
        conversations: Number(r?.conversations ?? 0),
        resolved: Number(r?.resolved ?? 0),
        escalated: Number(r?.escalated ?? 0),
        avgResponseTime: Number(r?.avgResponseTime ?? 0),
      })),
    };

    let aiSummary = '';
    try {
      const prompt =
        String(body?.prompt ?? '').trim() ||
        'Genera un informe gerencial ejecutivo con hallazgos, riesgos y acciones recomendadas.';
      const agent: AgentRuntime = {
        name: 'Analista de Informes ORQO',
        profile: {
          systemPrompt:
            'Eres analista senior de operaciones. Responde en español, concreto y con foco gerencial. Incluye recomendaciones accionables.',
          responseLength: 'long',
        },
      };
      const aiResult = await generateAgentReply({
        db,
        workspaceId: 'default',
        agent,
        message: `${prompt}\n\nDatos estructurados del periodo:\n${JSON.stringify(reportData)}`,
      });
      aiSummary = String(aiResult?.reply ?? '').trim();
    } catch {
      aiSummary =
        'No fue posible generar el resumen asistido por IA en este momento. Se entrega reporte estructurado con métricas del periodo.';
    }

    if (format === 'json') {
      await writeLog({
        level: 'info',
        source: 'reports',
        msg: 'Reporte AI generado',
        detail: `${fromStr}..${toStr}`,
      }).catch(() => {});
      return Response.json({ ok: true, report: reportData, aiSummary });
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        { metrica: 'Empresa', valor: reportData.business.name },
        { metrica: 'Plan', valor: reportData.business.plan },
        { metrica: 'Periodo', valor: `${fromStr} a ${toStr}` },
        { metrica: 'Conversaciones', valor: reportData.totals.conversations },
        { metrica: 'Resueltas', valor: reportData.totals.resolved },
        { metrica: 'Escaladas', valor: reportData.totals.escalated },
        { metrica: 'Tasa resolución', valor: `${reportData.totals.resolutionRate}%` },
        { metrica: 'Feedback recibido', valor: reportData.totals.feedbackResponses },
        { metrica: 'Satisfacción', valor: `${reportData.totals.satisfactionRate}%` },
        { metrica: 'Auto cerradas por inactividad', valor: reportData.totals.autoClosedByInactivity },
        { metrica: 'Tokens totales', valor: reportData.totals.tokensTotal },
        { metrica: 'Resumen IA', valor: aiSummary },
      ];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.daily), 'Diario');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.channels), 'Canales');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.models), 'Modelos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.statuses), 'Estados');

      const bytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `orqo_reporte_${fromStr}_${toStr}.xlsx`;
      await writeLog({
        level: 'info',
        source: 'reports',
        msg: 'Reporte XLSX generado',
        detail: filename,
      }).catch(() => {});
      return new Response(bytes, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let y = 805;

    const logo = await readLogoBytes(String(account?.logo_url ?? ''));
    if (logo) {
      try {
        const image = logo.mime.includes('png') ? await pdf.embedPng(logo.bytes) : await pdf.embedJpg(logo.bytes);
        const scale = Math.min(80 / image.width, 40 / image.height);
        page.drawImage(image, { x: 40, y: y - 30, width: image.width * scale, height: image.height * scale });
      } catch {
        // Ignore logo rendering errors.
      }
    }

    page.drawText(reportData.business.name, { x: 140, y, size: 18, font: fontBold, color: rgb(0.07, 0.12, 0.09) });
    y -= 22;
    page.drawText(`Informe gerencial ORQO · ${fromStr} a ${toStr}`, {
      x: 140,
      y,
      size: 11,
      font,
      color: rgb(0.28, 0.35, 0.31),
    });
    y -= 30;

    const kpis = [
      `Conversaciones: ${reportData.totals.conversations}`,
      `Resueltas: ${reportData.totals.resolved}`,
      `Escaladas: ${reportData.totals.escalated}`,
      `Tasa de resolución: ${reportData.totals.resolutionRate}%`,
      `Feedback recibido: ${reportData.totals.feedbackResponses}`,
      `Satisfacción: ${reportData.totals.satisfactionRate}%`,
      `Auto-cierre por inactividad: ${reportData.totals.autoClosedByInactivity}`,
      `Tokens totales: ${reportData.totals.tokensTotal}`,
    ];
    for (const row of kpis) {
      page.drawText(`• ${row}`, { x: 44, y, size: 10.5, font, color: rgb(0.11, 0.16, 0.13) });
      y -= 16;
    }

    y -= 8;
    page.drawText('Resumen asistido por IA', { x: 44, y, size: 12, font: fontBold, color: rgb(0.07, 0.12, 0.09) });
    y -= 18;
    y = writeWrappedLines({
      page,
      text: aiSummary,
      x: 44,
      y,
      maxWidth: 510,
      font,
      fontSize: 9.6,
      lineHeight: 13,
    });

    y -= 12;
    page.drawText('Top canales', { x: 44, y, size: 12, font: fontBold, color: rgb(0.07, 0.12, 0.09) });
    y -= 16;
    for (const ch of reportData.channels.slice(0, 6)) {
      page.drawText(`• ${ch.channel}: ${ch.count} conversaciones`, {
        x: 44,
        y,
        size: 10,
        font,
        color: rgb(0.11, 0.16, 0.13),
      });
      y -= 14;
      if (y < 60) break;
    }

    const pdfBytes = await pdf.save();
    const pdfBody = Buffer.from(pdfBytes as Uint8Array);
    const filename = `orqo_reporte_${fromStr}_${toStr}.pdf`;
    await writeLog({
      level: 'info',
      source: 'reports',
      msg: 'Reporte PDF generado',
      detail: filename,
    }).catch(() => {});

    return new Response(pdfBody as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    await writeLog({
      level: 'error',
      source: 'reports',
      msg: 'Error generando reporte gerencial',
      detail: e?.message ?? 'unknown',
    }).catch(() => {});
    return Response.json({ ok: false, error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
