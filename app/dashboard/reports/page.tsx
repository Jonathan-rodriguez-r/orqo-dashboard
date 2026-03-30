'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

type Analytics = {
  totals: {
    conversations: number; resolved: number; escalated: number;
    resolucion: number; desvio: number; avgResponseTime: number; trend: number;
  };
  daily: Array<{ date: string; label: string; conversations: number; resolved: number; escalated: number }>;
  byChannel: Array<{ channel: string; label: string; count: number; color: string }>;
  byHour: Array<{ hour: number; label: string; count: number }>;
};

const PERIODS = [
  { label: '7 días',  value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--g02)', border: '1px solid var(--g03)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--g05)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [days, setDays]     = useState(30);
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); setLoading(false); });
  }

  useEffect(() => { load(); }, [days]);

  async function runSeed() {
    setSeeding(true);
    await fetch('/api/seed', { method: 'POST' });
    setSeeding(false);
    load();
  }

  return (
    <div className="dash-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Informes</h1>
          <p className="page-sub">Análisis de rendimiento y ROI operativo</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
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
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 200, background: 'var(--g02)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : !data || data.totals.conversations === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <p style={{ color: 'var(--g05)', marginBottom: 20 }}>
            Sin datos de informes todavía. Carga datos de demo para ver análisis en acción.
          </p>
          <button className="btn btn-primary" onClick={runSeed} disabled={seeding}>
            {seeding ? 'Cargando...' : 'Cargar datos de demostración'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI summary */}
          <div className="stats-grid">
            {[
              { l: 'Total Conversaciones', v: data.totals.conversations.toLocaleString('es'), s: `Tendencia: ${data.totals.trend >= 0 ? '+' : ''}${data.totals.trend}%` },
              { l: 'Tasa de Resolución',   v: `${data.totals.resolucion}%`, s: `${data.totals.resolved.toLocaleString('es')} resueltas`, accent: true },
              { l: 'Desvío a Humano',      v: `${data.totals.desvio}%`, s: `${data.totals.escalated} escaladas` },
              { l: 'Tiempo Prom. Respuesta', v: `${data.totals.avgResponseTime}m`, s: 'Por conversación', accent: true },
              { l: 'ROI: Horas Ahorradas', v: `~${Math.round(data.totals.resolved * 0.25)}h`, s: `@ 15min por conv resuelta`, accent: true },
            ].map((k, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{k.l}</div>
                <div className={`stat-value${k.accent ? ' stat-acc' : ''}`}>{k.v}</div>
                <div className="stat-sub">{k.s}</div>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          <div className="card">
            <div className="card-title">Tendencia de Conversaciones — {days} días</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2CB978" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2CB978" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2CB978" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2CB978" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(data.daily.length / 7))}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT />}/>
                <Area type="monotone" dataKey="conversations" name="Total" stroke="#2CB978" strokeWidth={2.5}
                  fill="url(#gConv)" dot={false}/>
                <Area type="monotone" dataKey="resolved" name="Resueltas" stroke="#2CB978" strokeWidth={1.5}
                  fill="url(#gRes)" dot={false} strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid-2">
            {/* Channel breakdown */}
            <div className="card">
              <div className="card-title">Volumen por Canal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {data.byChannel.map((ch, i) => {
                  const pct = data.totals.conversations > 0
                    ? Math.round((ch.count / data.totals.conversations) * 100)
                    : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--g06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.color, display: 'inline-block' }}/>
                          {ch.label}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--g07)' }}>{ch.count} <span style={{ color: 'var(--g05)', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: ch.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly heatmap */}
            <div className="card">
              <div className="card-title">Horas Pico de Demanda</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byHour} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--g05)' }} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis tick={{ fontSize: 10, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT />}/>
                  <Bar dataKey="count" name="Convs." fill="#2CB978" radius={[3, 3, 0, 0]} opacity={0.85}/>
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 11.5, color: 'var(--g05)', marginTop: 8 }}>
                Hora con más demanda: {data.byHour.sort((a, b) => b.count - a.count)[0]?.label ?? '—'}
              </p>
            </div>
          </div>

          {/* Resolution table */}
          <div className="card">
            <div className="card-title">Rendimiento Diario — Últimos 10 días</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Conversaciones</th>
                    <th>Resueltas</th>
                    <th>Escaladas</th>
                    <th>Tasa Resolución</th>
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
                              <div className="progress-fill" style={{ width: `${res}%` }}/>
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
        </div>
      )}
    </div>
  );
}
