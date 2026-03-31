'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type Analytics = {
  totals: {
    conversations: number;
    resolved: number;
    escalated: number;
    resolucion: number;
    desvio: number;
    avgResponseTime: number;
    trend: number;
    feedbackResponses: number;
    helpfulYes: number;
    helpfulNo: number;
    satisfaction: number;
    closedByInactivity: number;
    closedConversations: number;
  };
  daily: Array<{ date: string; label: string; conversations: number; resolved: number; escalated: number }>;
  byChannel: Array<{ channel: string; label: string; count: number; color: string }>;
  byHour: Array<{ hour: number; label: string; count: number }>;
};

type GeneratedReport = {
  period: { from: string; to: string; days: number };
  business: { name: string; plan: string };
  totals: {
    conversations: number;
    resolved: number;
    escalated: number;
    resolutionRate: number;
    feedbackResponses: number;
    satisfactionRate: number;
    autoClosedByInactivity: number;
    tokensTotal: number;
  };
  channels: Array<{ channel: string; count: number; tokens: number }>;
  models: Array<{ provider: string; model: string; count: number }>;
};

const PERIODS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
];

const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--g02)', border: '1px solid var(--g03)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--g05)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function subtractDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(1, days));
  return d.toISOString().slice(0, 10);
}

async function downloadBlob(url: string, body: any, filenameFallback: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const filenameMatch = /filename="([^"]+)"/i.exec(cd);
  const filename = filenameMatch?.[1] || filenameFallback;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  const [fromDate, setFromDate] = useState(subtractDaysIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const [reportPrompt, setReportPrompt] = useState(
    'Genera un resumen gerencial con hallazgos, riesgos y acciones concretas por prioridad.'
  );
  const [generating, setGenerating] = useState(false);
  const [reportSummary, setReportSummary] = useState('');
  const [reportData, setReportData] = useState<GeneratedReport | null>(null);
  const [reportError, setReportError] = useState('');

  function load() {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [days]);

  useEffect(() => {
    setSelectedChannel('');
  }, [days]);

  async function runSeed() {
    setSeeding(true);
    await fetch('/api/seed', { method: 'POST' });
    setSeeding(false);
    load();
  }

  async function runReportGeneration() {
    setGenerating(true);
    setReportError('');
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          from: fromDate,
          to: toDate,
          prompt: reportPrompt,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'No fue posible generar el reporte');
      setReportSummary(String(json?.aiSummary || '').trim());
      setReportData((json?.report || null) as GeneratedReport | null);
    } catch (e: any) {
      setReportError(e?.message || 'Error generando reporte');
      setReportSummary('');
      setReportData(null);
    } finally {
      setGenerating(false);
    }
  }

  async function exportReport(format: 'xlsx' | 'pdf') {
    try {
      await downloadBlob(
        '/api/reports/generate',
        { format, from: fromDate, to: toDate, prompt: reportPrompt },
        format === 'xlsx' ? 'orqo_reporte.xlsx' : 'orqo_reporte.pdf'
      );
    } catch (e: any) {
      setReportError(e?.message || 'No se pudo exportar el reporte');
    }
  }

  const selectedChannelData = useMemo(() => {
    if (!data?.byChannel?.length) return null;
    if (!selectedChannel) return data.byChannel[0];
    return data.byChannel.find((c) => c.channel === selectedChannel) || data.byChannel[0];
  }, [data, selectedChannel]);

  return (
    <div className="dash-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Informes</h1>
          <p className="page-sub">Analisis de rendimiento, cierre conversacional y reporte gerencial asistido por AI</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`btn btn-sm ${days === p.value ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 200,
                background: 'var(--g02)',
                borderRadius: 'var(--radius-lg)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : !data || data.totals.conversations === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <p style={{ color: 'var(--g05)', marginBottom: 20 }}>
            Sin datos de informes todavia. Carga datos de demo para ver analisis en accion.
          </p>
          <button className="btn btn-primary" onClick={runSeed} disabled={seeding}>
            {seeding ? 'Cargando...' : 'Cargar datos de demostracion'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="stats-grid">
            {[
              {
                l: 'Total Conversaciones',
                v: data.totals.conversations.toLocaleString('es'),
                s: `Tendencia: ${data.totals.trend >= 0 ? '+' : ''}${data.totals.trend}%`,
              },
              {
                l: 'Tasa de Resolucion',
                v: `${data.totals.resolucion}%`,
                s: `${data.totals.resolved.toLocaleString('es')} resueltas`,
                accent: true,
              },
              { l: 'Desvio a Humano', v: `${data.totals.desvio}%`, s: `${data.totals.escalated} escaladas` },
              {
                l: 'Satisfaccion',
                v: `${data.totals.satisfaction}%`,
                s: `${data.totals.feedbackResponses} respuestas de feedback`,
                accent: true,
              },
              {
                l: 'Auto-cierre inactividad',
                v: `${data.totals.closedByInactivity}`,
                s: `${data.totals.closedConversations} conversaciones cerradas`,
              },
              {
                l: 'Tiempo Prom. Respuesta',
                v: `${data.totals.avgResponseTime}m`,
                s: 'Por conversacion',
                accent: true,
              },
            ].map((k, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{k.l}</div>
                <div className={`stat-value${k.accent ? ' stat-acc' : ''}`}>{k.v}</div>
                <div className="stat-sub">{k.s}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Tendencia de Conversaciones - {days} dias</div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2CB978" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2CB978" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22A26A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22A26A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--g05)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.daily.length / 7))}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="conversations" name="Total" stroke="#2CB978" strokeWidth={2.5} fill="url(#gConv)" dot={false} />
                <Area type="monotone" dataKey="resolved" name="Resueltas" stroke="#22A26A" strokeWidth={1.5} fill="url(#gRes)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title">Volumen por Canal (interactivo)</div>
              <div style={{ fontSize: 12, color: 'var(--g05)', marginBottom: 10 }}>
                Haz clic sobre una barra o una porcion para enfocar el canal.
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byChannel} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CT />} />
                  <Bar dataKey="count" name="Conversaciones" radius={[4, 4, 0, 0]}>
                    {data.byChannel.map((entry, idx) => {
                      const active = (selectedChannel || selectedChannelData?.channel) === entry.channel;
                      return (
                        <Cell
                          key={idx}
                          fill={entry.color}
                          fillOpacity={active ? 1 : 0.55}
                          cursor="pointer"
                          onClick={() => setSelectedChannel(entry.channel)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {selectedChannelData && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--g06)' }}>
                  Canal foco: <strong>{selectedChannelData.label}</strong> · {selectedChannelData.count.toLocaleString('es')} conversaciones
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Distribucion por Canal</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Tooltip content={<CT />} />
                  <Pie data={data.byChannel} dataKey="count" nameKey="label" innerRadius={48} outerRadius={86} paddingAngle={2}>
                    {data.byChannel.map((entry, idx) => {
                      const active = (selectedChannel || selectedChannelData?.channel) === entry.channel;
                      return (
                        <Cell
                          key={idx}
                          fill={entry.color}
                          fillOpacity={active ? 1 : 0.6}
                          cursor="pointer"
                          onClick={() => setSelectedChannel(entry.channel)}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.byChannel.map((ch) => (
                  <button
                    key={ch.channel}
                    className={`btn btn-sm ${selectedChannel === ch.channel ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSelectedChannel((prev) => (prev === ch.channel ? '' : ch.channel))}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Rendimiento Diario - Ultimos 10 dias</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Conversaciones</th>
                    <th>Resueltas</th>
                    <th>Escaladas</th>
                    <th>Tasa Resolucion</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().slice(0, 10).map((d, i) => {
                    const res = d.conversations > 0 ? Math.round((d.resolved / d.conversations) * 100) : 0;
                    return (
                      <tr key={i}>
                        <td>{d.label}</td>
                        <td>{d.conversations}</td>
                        <td style={{ color: 'var(--acc)' }}>{d.resolved}</td>
                        <td style={{ color: d.escalated > 0 ? 'var(--yellow)' : 'var(--g05)' }}>{d.escalated}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60, flexShrink: 0 }}>
                              <div className="progress-fill" style={{ width: `${res}%` }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--g05)' }}>{res}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Reporteador Gerencial Asistido por AI</div>
            <p style={{ color: 'var(--g05)', fontSize: 12, marginBottom: 12 }}>
              Genera reportes dinamicos por rango de fechas con resumen ejecutivo IA y exportacion a XLSX/PDF.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Desde</label>
                <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Hasta</label>
                <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Enfoque del informe</label>
              <textarea
                className="input"
                rows={3}
                value={reportPrompt}
                onChange={(e) => setReportPrompt(e.target.value)}
                placeholder="Ejemplo: Prioriza riesgos de operación, experiencia de cliente y acciones para el próximo mes."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={runReportGeneration} disabled={generating}>
                {generating ? 'Generando...' : 'Generar resumen IA'}
              </button>
              <button className="btn btn-ghost" onClick={() => exportReport('xlsx')} disabled={generating}>
                Exportar XLSX
              </button>
              <button className="btn btn-ghost" onClick={() => exportReport('pdf')} disabled={generating}>
                Exportar PDF
              </button>
            </div>
            {reportError && (
              <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 12 }}>
                {reportError}
              </div>
            )}
            {reportSummary && (
              <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--g03)', borderRadius: 10, background: 'var(--g01)' }}>
                <div style={{ fontSize: 12, color: 'var(--g05)', marginBottom: 6 }}>Resumen ejecutivo IA</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--g07)', lineHeight: 1.6 }}>{reportSummary}</div>
              </div>
            )}
            {reportData && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--g05)' }}>
                Reporte listo: {reportData.business.name} · {reportData.period.from} a {reportData.period.to} ·{' '}
                {reportData.totals.conversations.toLocaleString('es')} conversaciones
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

