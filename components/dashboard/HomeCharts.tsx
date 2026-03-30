'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

type AnalyticsData = {
  totals: {
    conversations: number;
    resolved: number;
    escalated: number;
    resolucion: number;
    desvio: number;
    avgResponseTime: number;
    trend: number;
    prevConversations: number;
  };
  daily: Array<{ date: string; label: string; conversations: number; resolved: number; escalated: number }>;
  byChannel: Array<{ channel: string; label: string; count: number; color: string }>;
  byHour: Array<{ hour: number; label: string; count: number }>;
};

function Skeleton({ h = 200 }: { h?: number }) {
  return (
    <div style={{
      height: h,
      background: 'var(--g02)',
      borderRadius: 'var(--radius-sm)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function KpiCard({
  label, value, sub, accent = false, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  trend?: number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${accent ? ' stat-acc' : ''}`}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: trend >= 0 ? 'var(--acc)' : 'var(--red)',
            background: trend >= 0 ? 'var(--acc-g)' : 'var(--red-g)',
            padding: '1px 6px',
            borderRadius: 20,
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <div className="stat-sub" style={{ marginTop: 0 }}>{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--g02)',
      border: '1px solid var(--g03)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--g05)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function HomeCharts({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/analytics?days=${days}`);
      const j = await r.json();
      if (j.ok) setData(j);
      else setError(j.error ?? 'Error cargando métricas');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    await fetch('/api/seed', { method: 'POST' });
    setSeeding(false);
    load();
  }

  useEffect(() => { load(); }, [days]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="stats-grid">
        {[1,2,3,4,5].map(i => <Skeleton key={i} h={96} />)}
      </div>
      <Skeleton h={240} />
      <div className="grid-2"><Skeleton h={200} /><Skeleton h={200} /></div>
    </div>
  );

  if (error || !data || data.totals.conversations === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
      <p style={{ color: 'var(--g05)', marginBottom: 16 }}>
        {error || 'Sin datos de analíticas todavía. Carga datos de demo para ver el dashboard en acción.'}
      </p>
      <button className="btn btn-primary" onClick={runSeed} disabled={seeding}>
        {seeding ? 'Cargando datos de demo...' : 'Cargar datos de demostración'}
      </button>
    </div>
  );

  const { totals, daily, byChannel, byHour } = data;

  // Peak hours — top 6 for display
  const peakHours = [...byHour].sort((a, b) => b.count - a.count).slice(0, 6);
  const peakLabel = peakHours.map(h => h.label).join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <KpiCard
          label="Conversaciones"
          value={totals.conversations.toLocaleString('es')}
          sub="Últimos 30 días"
          trend={totals.trend}
        />
        <KpiCard
          label="Tasa de Resolución"
          value={`${totals.resolucion}%`}
          sub={`${totals.resolved.toLocaleString('es')} resueltas`}
          accent
        />
        <KpiCard
          label="Desvío a Humano"
          value={`${totals.desvio}%`}
          sub={`${totals.escalated} escaladas`}
        />
        <KpiCard
          label="T. Respuesta Prom."
          value={`${totals.avgResponseTime}m`}
          sub="Tiempo promedio"
          accent
        />
        <KpiCard
          label="Horas Pico"
          value={peakHours[0]?.label ?? '—'}
          sub={`También: ${peakHours.slice(1,3).map(h=>h.label).join(', ')}`}
        />
      </div>

      {/* ── Conversaciones por día ───────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Conversaciones por día</div>
          <span style={{ fontSize: 12, color: 'var(--g05)' }}>Últimos {days} días</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2CB978" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#2CB978" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorEsc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DC4848" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#DC4848" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false}
              interval={Math.floor(daily.length / 6)}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip />}/>
            <Area type="monotone" dataKey="conversations" name="Total" stroke="#2CB978" strokeWidth={2}
              fill="url(#colorConv)" dot={false}/>
            <Area type="monotone" dataKey="escalated" name="Escaladas" stroke="#DC4848" strokeWidth={1.5}
              fill="url(#colorEsc)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Distribución canal + Horas pico ──────────────────────────────── */}
      <div className="grid-2">
        {/* Canal */}
        <div className="card">
          <div className="card-title">Por Canal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie
                  data={byChannel}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {byChannel.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n: string, props: any) => [
                    `${v.toLocaleString('es')} (${Math.round((v / totals.conversations) * 100)}%)`,
                    props.payload.label,
                  ]}
                  contentStyle={{ background: 'var(--g02)', border: '1px solid var(--g03)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {byChannel.slice(0, 5).map((ch, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ch.color, flexShrink: 0 }}/>
                  <span style={{ color: 'var(--g06)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</span>
                  <span style={{ color: 'var(--g05)', fontWeight: 600 }}>{ch.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horas pico */}
        <div className="card">
          <div className="card-title">Distribución Horaria</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byHour} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--g05)' }} axisLine={false} tickLine={false}
                interval={3}/>
              <YAxis tick={{ fontSize: 10, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="count" name="Convs." fill="#2CB978" radius={[3,3,0,0]} opacity={0.85}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Resolución vs Escalación ──────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Resolución vs Escalación</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2CB978', display: 'inline-block'}}/>
              <span style={{ color: 'var(--g05)' }}>Resueltas</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC4848', display: 'inline-block'}}/>
              <span style={{ color: 'var(--g05)' }}>Escaladas</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={daily.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--g03)" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize: 10, fill: 'var(--g05)' }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip />}/>
            <Bar dataKey="resolved" name="Resueltas" stackId="a" fill="#2CB978" radius={[0,0,0,0]}/>
            <Bar dataKey="escalated" name="Escaladas" stackId="a" fill="#DC4848" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
