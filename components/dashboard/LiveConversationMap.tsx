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

function project(lng: number, lat: number) {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 320;
  return { x, y };
}

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

export default function LiveConversationMap({ channels }: Props) {
  const hotspots = buildHotspots(channels);
  const topHotspots = [...hotspots].sort((a, b) => b.count - a.count).slice(0, 4);
  const leader = topHotspots[0];
  const totalLoad = hotspots.reduce((sum, item) => sum + item.count, 0);
  const uniqueCities = new Set(hotspots.map((item) => item.city)).size;
  const byChannel = hotspots.reduce<Record<string, { label: string; color: string; total: number }>>((acc, item) => {
    const key = item.channel;
    if (!acc[key]) acc[key] = { label: item.channel, color: item.color, total: 0 };
    acc[key].total += item.count;
    return acc;
  }, {});
  const topChannels = Object.values(byChannel).sort((a, b) => b.total - a.total).slice(0, 3);

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

      <div className="world-main">
        <div className="world-map-wrap">
          <svg viewBox="0 0 1000 320" className="world-map-svg" role="img" aria-label="Mapa mundial de conversaciones">
            <defs>
              <linearGradient id="worldBgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(13,17,15,0.92)" />
                <stop offset="100%" stopColor="rgba(9,12,11,0.98)" />
              </linearGradient>
              <linearGradient id="continentGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(44,185,120,0.34)" />
                <stop offset="100%" stopColor="rgba(44,185,120,0.10)" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="1000" height="320" fill="url(#worldBgGrad)" rx="14" />

            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={26 + i * 36} x2="1000" y2={26 + i * 36} stroke="rgba(120,155,138,0.16)" strokeWidth="1" />
            ))}
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`v-${i}`} x1={20 + i * 64} y1="0" x2={20 + i * 64} y2="320" stroke="rgba(120,155,138,0.1)" strokeWidth="1" />
            ))}

            <g fill="url(#continentGrad)" stroke="rgba(44,185,120,0.42)" strokeWidth="1.2">
              <path d="M66 124L128 102L190 110L236 128L272 154L252 182L214 188L196 206L138 206L92 186L72 158Z" />
              <path d="M192 96L230 84L266 92L282 108L262 124L222 126L202 116Z" />
              <path d="M248 210L286 222L312 256L294 314L266 352L236 328L222 282L226 238Z" />
              <path d="M430 122L466 108L502 116L524 132L510 150L474 156L444 146Z" />
              <path d="M458 166L508 176L538 218L526 286L488 332L454 298L438 246L444 200Z" />
              <path d="M520 114L588 92L670 102L750 122L824 156L808 182L748 188L704 176L654 180L596 162L544 148Z" />
              <path d="M618 196L658 202L692 226L680 262L646 266L618 244L608 220Z" />
              <path d="M734 196L754 182L774 194L764 214Z" />
              <path d="M736 268L796 282L848 314L824 348L760 342L724 302Z" />
            </g>

            {leader && topHotspots.slice(1).map((p) => {
              const from = project(leader.lng, leader.lat);
              const to = project(p.lng, p.lat);
              const cx = (from.x + to.x) / 2;
              const cy = Math.min(from.y, to.y) - 44;
              return (
                <path
                  key={`arc-${p.id}`}
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="rgba(44,185,120,0.28)"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                />
              );
            })}

            {hotspots.map((p, idx) => {
              const { x, y } = project(p.lng, p.lat);
              const radius = 2.8 + Math.min(8, p.count / 12);
              return (
                <g key={p.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="1.4"
                    opacity="0.55"
                    className="world-pulse-ring"
                    style={{ animationDelay: `${idx * 140}ms` }}
                  />
                  <circle cx={x} cy={y} r={radius} fill={p.color} />
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="world-side-card" aria-label="Resumen geografico">
          <div className="world-side-metric">
            <span>Cobertura activa</span>
            <strong>{uniqueCities} ciudades</strong>
          </div>
          <div className="world-side-metric">
            <span>Volumen estimado</span>
            <strong>{totalLoad}</strong>
          </div>
          <div className="world-side-list">
            {topChannels.map((item) => (
              <div key={item.label} className="world-side-row">
                <span className="world-hotspot-dot" style={{ background: item.color }} />
                <span className="world-side-label">{item.label}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="world-hotspots">
        {topHotspots.map((p) => (
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
