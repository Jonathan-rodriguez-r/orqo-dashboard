'use client';

type ChannelStat = {
  channel: string;
  count: number;
  color: string;
  label: string;
};

type Hotspot = {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  channel: string;
  color: string;
  count: number;
};

type Props = {
  channels: ChannelStat[];
};

const CHANNEL_CITIES: Record<string, Array<{ city: string; country: string; lat: number; lng: number }>> = {
  whatsapp: [
    { city: 'Bogota', country: 'CO', lat: 4.71, lng: -74.07 },
    { city: 'Sao Paulo', country: 'BR', lat: -23.55, lng: -46.63 },
    { city: 'Mexico City', country: 'MX', lat: 19.43, lng: -99.13 },
  ],
  instagram: [
    { city: 'Buenos Aires', country: 'AR', lat: -34.6, lng: -58.38 },
    { city: 'Santiago', country: 'CL', lat: -33.45, lng: -70.66 },
    { city: 'Lima', country: 'PE', lat: -12.04, lng: -77.03 },
  ],
  facebook: [
    { city: 'Madrid', country: 'ES', lat: 40.41, lng: -3.7 },
    { city: 'Miami', country: 'US', lat: 25.76, lng: -80.19 },
    { city: 'Monterrey', country: 'MX', lat: 25.68, lng: -100.31 },
  ],
  widget: [
    { city: 'Barcelona', country: 'ES', lat: 41.38, lng: 2.17 },
    { city: 'New York', country: 'US', lat: 40.71, lng: -74.0 },
    { city: 'Bogota', country: 'CO', lat: 4.71, lng: -74.07 },
  ],
  woocommerce: [
    { city: 'Madrid', country: 'ES', lat: 40.41, lng: -3.7 },
    { city: 'Lima', country: 'PE', lat: -12.04, lng: -77.03 },
    { city: 'Quito', country: 'EC', lat: -0.18, lng: -78.47 },
  ],
  shopify: [
    { city: 'Toronto', country: 'CA', lat: 43.65, lng: -79.38 },
    { city: 'New York', country: 'US', lat: 40.71, lng: -74.0 },
    { city: 'London', country: 'UK', lat: 51.51, lng: -0.13 },
  ],
};

const FALLBACK_CITIES = [
  { city: 'Bogota', country: 'CO', lat: 4.71, lng: -74.07 },
  { city: 'Madrid', country: 'ES', lat: 40.41, lng: -3.7 },
  { city: 'New York', country: 'US', lat: 40.71, lng: -74.0 },
  { city: 'Sao Paulo', country: 'BR', lat: -23.55, lng: -46.63 },
];

function buildHotspots(channels: ChannelStat[]): Hotspot[] {
  const ranked = [...channels].sort((a, b) => b.count - a.count).slice(0, 4);
  const base = ranked.length > 0 ? ranked : [{ channel: 'widget', count: 20, color: '#2CB978', label: 'Widget Web' }];
  const points: Hotspot[] = [];

  for (const stat of base) {
    const cities = CHANNEL_CITIES[stat.channel] ?? FALLBACK_CITIES;
    cities.slice(0, 3).forEach((city, index) => {
      const weight = Math.max(4, Math.round(stat.count / (index + 1.6)));
      points.push({
        id: `${stat.channel}-${city.city}-${index}`,
        city: city.city,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        channel: stat.label,
        color: stat.color,
        count: weight,
      });
    });
  }

  return points.slice(0, 12);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildWavePath(seed: number, amplitude: number, baseline: number) {
  let d = '';
  const step = 64;
  for (let x = 0; x <= 1000; x += step) {
    const y =
      baseline +
      Math.sin(x * (0.012 + seed * 0.0018) + seed * 0.8) * amplitude +
      Math.cos(x * (0.006 + seed * 0.0012) + seed * 1.7) * (amplitude * 0.36);
    const yy = clamp(y, 50, 278);
    d += `${x === 0 ? 'M' : 'L'} ${x} ${yy.toFixed(1)} `;
  }
  return d.trim();
}

function nodePoint(item: Hotspot, index: number) {
  const normalizedLng = ((item.lng + 180) / 360) * 880 + 60;
  const laneOffset = (index % 2 === 0 ? -16 : 16) + ((index % 3) - 1) * 4;
  const x = clamp(normalizedLng + laneOffset, 52, 948);
  const intensity = Math.min(1, item.count / 48);
  const y = clamp(228 - intensity * 130 + (index % 3) * 10, 68, 270);
  return { x, y };
}

export default function LiveConversationMap({ channels }: Props) {
  const hotspots = buildHotspots(channels);
  const topHotspots = [...hotspots].sort((a, b) => b.count - a.count).slice(0, 4);
  const totalLoad = hotspots.reduce((sum, item) => sum + item.count, 0);
  const uniqueCities = new Set(hotspots.map((item) => item.city)).size;
  const byChannel = hotspots.reduce<Record<string, { label: string; color: string; total: number }>>((acc, item) => {
    const key = item.channel;
    if (!acc[key]) acc[key] = { label: item.channel, color: item.color, total: 0 };
    acc[key].total += item.count;
    return acc;
  }, {});
  const topChannels = Object.values(byChannel).sort((a, b) => b.total - a.total).slice(0, 3);
  const streamSeries = topChannels.length > 0
    ? topChannels
    : [{ label: 'Widget Web', color: '#2CB978', total: 36 }];
  const keyCities = topHotspots.length > 0
    ? topHotspots
    : FALLBACK_CITIES.slice(0, 3).map((city, idx) => ({
      id: `fallback-${city.city}-${idx}`,
      city: city.city,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      channel: 'Widget Web',
      color: '#2CB978',
      count: 10 + idx * 6,
    }));
  const strongest = keyCities[0];
  const avgLoad = keyCities.length > 0 ? Math.round(totalLoad / keyCities.length) : 0;

  return (
    <div className="world-card">
      <div className="world-card-head">
        <div>
          <h3>Mundo conversacional en vivo</h3>
          <p>Actividad global estimada por canal y volumen reciente</p>
        </div>
        <div className="world-live-badge">
          <span className="dot dot-green" />
          Live
        </div>
      </div>

      <div className="world-main world-main-full">
        <div className="world-map-wrap world-pulse-wrap">
          <svg
            viewBox="0 0 1000 320"
            preserveAspectRatio="xMidYMid slice"
            className="world-pulse-svg"
            role="img"
            aria-label="Pulso global de conversaciones"
          >
            <defs>
              <linearGradient id="pulseBgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(12,17,16,0.96)" />
                <stop offset="100%" stopColor="rgba(8,12,11,0.98)" />
              </linearGradient>
              <linearGradient id="pulseGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(44,185,120,0)" />
                <stop offset="50%" stopColor="rgba(44,185,120,0.30)" />
                <stop offset="100%" stopColor="rgba(44,185,120,0)" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="1000" height="320" fill="url(#pulseBgGrad)" rx="14" />

            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={24 + i * 34} x2="1000" y2={24 + i * 34} stroke="rgba(112,145,130,0.14)" strokeWidth="1" />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <line key={`v-${i}`} x1={24 + i * 56} y1="0" x2={24 + i * 56} y2="320" stroke="rgba(112,145,130,0.08)" strokeWidth="1" />
            ))}

            <rect x="80" y="64" width="840" height="192" fill="url(#pulseGlow)" opacity="0.75" rx="20" />

            {streamSeries.slice(0, 4).map((series, idx) => (
              <path
                key={`wave-${series.label}`}
                d={buildWavePath(idx + 1, 12 + idx * 5, 88 + idx * 46)}
                fill="none"
                stroke={series.color}
                strokeOpacity={0.45 - idx * 0.06}
                strokeWidth={idx === 0 ? 2.8 : 2}
              />
            ))}

            {keyCities.slice(1).map((p, idx) => {
              const from = nodePoint(keyCities[0], 0);
              const to = nodePoint(p, idx + 1);
              const cx = (from.x + to.x) / 2;
              const cy = Math.min(from.y, to.y) - 30;
              return (
                <path
                  key={`arc-${p.id}`}
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="rgba(44,185,120,0.36)"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                />
              );
            })}

            {keyCities.map((p, idx) => {
              const { x, y } = nodePoint(p, idx);
              const radius = 3 + Math.min(8, p.count / 12);
              return (
                <g key={p.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="1.4"
                    opacity="0.6"
                    className="world-pulse-ring"
                    style={{ animationDelay: `${idx * 140}ms` }}
                  />
                  <circle cx={x} cy={y} r={radius} fill={p.color} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="world-stats-strip">
        <div className="world-stat-item">
          <span>Cobertura activa</span>
          <strong>{uniqueCities} ciudades</strong>
        </div>
        <div className="world-stat-item">
          <span>Volumen estimado</span>
          <strong>{totalLoad}</strong>
        </div>
        <div className="world-stat-item">
          <span>Canal lider</span>
          <strong>{streamSeries[0]?.label ?? 'Widget Web'}</strong>
        </div>
        <div className="world-stat-item">
          <span>Ciudad principal</span>
          <strong>{strongest ? `${strongest.city}, ${strongest.country}` : '-'}</strong>
        </div>
      </div>

      <div className="world-channel-strip">
        {streamSeries.map((item) => (
          <div key={`ch-${item.label}`} className="world-channel-pill">
            <span className="world-hotspot-dot" style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{item.total}</strong>
          </div>
        ))}
        {avgLoad > 0 && (
          <div className="world-channel-pill world-channel-pill-muted">
            <span>Promedio por ciudad</span>
            <strong>{avgLoad}</strong>
          </div>
        )}
      </div>

      <div className="world-hotspots">
        {keyCities.map((p) => (
          <div key={`hs-${p.id}`} className="world-hotspot-item">
            <span className="world-hotspot-dot" style={{ background: p.color }} />
            <span>{p.city}, {p.country}</span>
            <strong>{p.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
