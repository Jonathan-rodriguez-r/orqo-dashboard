import { getDb } from '@/lib/mongodb';
import { generateAgentReply, type AgentRuntime } from '@/lib/ai-orchestrator';
import { writeLog } from '@/app/api/admin/logs/route';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type ReportFormat = 'json' | 'xlsx' | 'pdf';
type ReportMode = 'stats' | 'ai';

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

function normalizeHexColor(value: unknown, fallback: string) {
  const raw = String(value ?? '').trim();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
}

function hexToRgb01(hexRaw: string) {
  const hex = normalizeHexColor(hexRaw, '#2CB978').replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function stripMarkdown(input: string) {
  return String(input || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s?/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
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
  color?: any;
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
    args.page.drawText(row, {
      x: args.x,
      y,
      size: args.fontSize,
      font: args.font,
      color: args.color ?? rgb(0.11, 0.16, 0.13),
    });
    y -= args.lineHeight;
  }
  return y;
}

function statsNarrative(report: any) {
  return [
    `Conversaciones: ${report.totals.conversations}. Resueltas: ${report.totals.resolved}. Escaladas: ${report.totals.escalated}.`,
    `Tasa de resolucion: ${report.totals.resolutionRate}%. Satisfaccion: ${report.totals.satisfactionRate}%.`,
    `Feedback recibido: ${report.totals.feedbackResponses}. Auto-cierre por inactividad: ${report.totals.autoClosedByInactivity}.`,
    `Tokens procesados: ${report.totals.tokensTotal}.`,
  ].join(' ');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const format: ReportFormat = ['xlsx', 'pdf'].includes(String(body?.format)) ? body.format : 'json';
    const mode: ReportMode = String(body?.mode) === 'ai' ? 'ai' : 'stats';

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
      mode,
      period: { from: fromStr, to: toStr, days },
      business: {
        name: String(account?.business_name || 'Cuenta ORQO'),
        plan: String(account?.plan || 'Starter'),
        operationsOwner: String(account?.operations_owner || ''),
        reportRecipients: String(account?.report_recipients || ''),
        slaFirstResponseMin: Number(account?.sla_first_response_min ?? 0),
      },
      brand: {
        primaryColor: normalizeHexColor(account?.brand_primary_color, '#2CB978'),
        secondaryColor: normalizeHexColor(account?.brand_secondary_color, '#0B100D'),
      },
      totals: {
        conversations: totalsDaily.conversations,
        resolved: totalsDaily.resolved,
        escalated: totalsDaily.escalated,
        resolutionRate: totalsDaily.conversations > 0 ? Math.round((totalsDaily.resolved / totalsDaily.conversations) * 100) : 0,
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
    if (mode === 'ai') {
      try {
        const prompt =
          String(body?.prompt ?? '').trim() ||
          'Genera un informe gerencial ejecutivo para direccion. Estructura: resumen ejecutivo, KPIs, hallazgos por canal, riesgos, oportunidades y plan de accion 30-60-90 dias.';

        const agent: AgentRuntime = {
          name: 'Analista de Informes ORQO',
          profile: {
            systemPrompt:
              'Eres analista senior de operaciones y revenue. Responde en espanol profesional para gerencia, con conclusiones accionables y sustentadas en datos.',
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
        aiSummary = 'No fue posible generar el resumen asistido por IA en este momento. Se entrega reporte estadistico del periodo.';
      }
    }

    if (format === 'json') {
      await writeLog({
        level: 'info',
        source: 'reports',
        msg: `Reporte ${mode === 'ai' ? 'AI' : 'estadistico'} generado`,
        detail: `${fromStr}..${toStr}`,
      }).catch(() => {});

      return Response.json({ ok: true, mode, report: reportData, aiSummary });
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        { metrica: 'Tipo de reporte', valor: mode === 'ai' ? 'Gerencial asistido por AI' : 'Estadistico por rango' },
        { metrica: 'Empresa', valor: reportData.business.name },
        { metrica: 'Plan', valor: reportData.business.plan },
        { metrica: 'Periodo', valor: `${fromStr} a ${toStr}` },
        { metrica: 'Conversaciones', valor: reportData.totals.conversations },
        { metrica: 'Resueltas', valor: reportData.totals.resolved },
        { metrica: 'Escaladas', valor: reportData.totals.escalated },
        { metrica: 'Tasa resolucion', valor: `${reportData.totals.resolutionRate}%` },
        { metrica: 'Feedback recibido', valor: reportData.totals.feedbackResponses },
        { metrica: 'Satisfaccion', valor: `${reportData.totals.satisfactionRate}%` },
        { metrica: 'Auto cierres por inactividad', valor: reportData.totals.autoClosedByInactivity },
        { metrica: 'Tokens totales', valor: reportData.totals.tokensTotal },
      ];
      if (mode === 'ai') {
        summaryRows.push({ metrica: 'Resumen IA', valor: stripMarkdown(aiSummary) });
      }

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.daily), 'Diario');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.channels), 'Canales');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.models), 'Modelos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.statuses), 'Estados');

      const bytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `orqo_reporte_${mode}_${fromStr}_${toStr}.xlsx`;
      await writeLog({
        level: 'info',
        source: 'reports',
        msg: `Reporte XLSX ${mode} generado`,
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

    const primary = hexToRgb01(reportData.brand.primaryColor);
    const secondary = hexToRgb01(reportData.brand.secondaryColor);

    page.drawRectangle({ x: 0, y: 758, width: 595, height: 84, color: secondary });
    page.drawRectangle({ x: 0, y: 742, width: 595, height: 18, color: primary, opacity: 0.9 });

    const logo = await readLogoBytes(String(account?.logo_url ?? ''));
    if (logo) {
      try {
        const image = logo.mime.includes('png') ? await pdf.embedPng(logo.bytes) : await pdf.embedJpg(logo.bytes);
        const scale = Math.min(58 / image.width, 38 / image.height);
        page.drawImage(image, { x: 36, y: 785, width: image.width * scale, height: image.height * scale });
      } catch {
        // ignore logo issues
      }
    }

    page.drawText(reportData.business.name, { x: 112, y: 804, size: 18, font: fontBold, color: rgb(0.95, 0.96, 0.95) });
    page.drawText(mode === 'ai' ? 'Informe Gerencial Asistido por AI' : 'Informe Estadistico por Rango', {
      x: 112,
      y: 786,
      size: 10,
      font,
      color: rgb(0.82, 0.88, 0.84),
    });
    page.drawText(`${fromStr} a ${toStr}`, { x: 430, y: 804, size: 10, font: fontBold, color: rgb(0.95, 0.96, 0.95) });
    page.drawText(`Plan ${reportData.business.plan}`, { x: 430, y: 788, size: 9, font, color: rgb(0.82, 0.88, 0.84) });

    const kpis = [
      { label: 'Conversaciones', value: String(reportData.totals.conversations) },
      { label: 'Resueltas', value: String(reportData.totals.resolved) },
      { label: 'Escaladas', value: String(reportData.totals.escalated) },
      { label: 'Tasa de resolucion', value: `${reportData.totals.resolutionRate}%` },
      { label: 'Feedback', value: String(reportData.totals.feedbackResponses) },
      { label: 'Satisfaccion', value: `${reportData.totals.satisfactionRate}%` },
      { label: 'Auto-cierre inactividad', value: String(reportData.totals.autoClosedByInactivity) },
      { label: 'Tokens totales', value: String(reportData.totals.tokensTotal) },
    ];

    let cardX = 36;
    let cardY = 716;
    for (let i = 0; i < kpis.length; i++) {
      const item = kpis[i];
      page.drawRectangle({ x: cardX, y: cardY, width: 126, height: 54, color: rgb(0.96, 0.98, 0.97) });
      page.drawRectangle({ x: cardX, y: cardY + 51, width: 126, height: 3, color: primary });
      page.drawText(item.label, { x: cardX + 8, y: cardY + 36, size: 8.5, font, color: rgb(0.3, 0.38, 0.34) });
      page.drawText(item.value, { x: cardX + 8, y: cardY + 15, size: 13, font: fontBold, color: rgb(0.08, 0.13, 0.1) });

      cardX += 136;
      if ((i + 1) % 4 === 0) {
        cardX = 36;
        cardY -= 64;
      }
    }

    let y = 560;
    page.drawText(mode === 'ai' ? 'Resumen Ejecutivo AI' : 'Resumen Estadistico del Periodo', {
      x: 36,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.07, 0.12, 0.09),
    });
    y -= 16;

    const summaryText = mode === 'ai' ? stripMarkdown(aiSummary) : statsNarrative(reportData);
    y = writeWrappedLines({
      page,
      text: summaryText,
      x: 36,
      y,
      maxWidth: 520,
      font,
      fontSize: 9.4,
      lineHeight: 12,
      color: rgb(0.15, 0.2, 0.17),
    });

    y -= 8;
    page.drawText('Top canales', { x: 36, y, size: 11, font: fontBold, color: rgb(0.07, 0.12, 0.09) });
    y -= 14;

    for (const ch of reportData.channels.slice(0, 6)) {
      const barWidth = Math.min(220, ch.count * 5);
      page.drawText(`${String(ch.channel).toUpperCase()}: ${ch.count} conversaciones`, {
        x: 36,
        y,
        size: 9.3,
        font,
        color: rgb(0.13, 0.18, 0.15),
      });
      page.drawRectangle({ x: 280, y: y + 2, width: 230, height: 6, color: rgb(0.89, 0.92, 0.9) });
      page.drawRectangle({ x: 280, y: y + 2, width: barWidth, height: 6, color: primary });
      y -= 14;
      if (y < 70) break;
    }

    page.drawText('Reporte generado por ORQO Analytics', {
      x: 36,
      y: 32,
      size: 8.5,
      font,
      color: rgb(0.45, 0.5, 0.47),
    });

    const pdfBytes = await pdf.save();
    const pdfBody = Buffer.from(pdfBytes as Uint8Array);
    const filename = `orqo_reporte_${mode}_${fromStr}_${toStr}.pdf`;

    await writeLog({
      level: 'info',
      source: 'reports',
      msg: `Reporte PDF ${mode} generado`,
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
