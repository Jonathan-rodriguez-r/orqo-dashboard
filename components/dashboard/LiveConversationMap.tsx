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
  const y = ((90 - lat) / 180) * 300;
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

      <div className="world-map-wrap">
        <svg viewBox="0 0 1000 300" className="world-map-svg" role="img" aria-label="Mapa mundial de conversaciones">
          <defs>
            <linearGradient id="worldBgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(13,17,15,0.92)" />
              <stop offset="100%" stopColor="rgba(9,12,11,0.98)" />
            </linearGradient>
            <linearGradient id="continentGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(44,185,120,0.18)" />
              <stop offset="100%" stopColor="rgba(44,185,120,0.05)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="300" fill="url(#worldBgGrad)" rx="14" />

          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={36 + i * 34} x2="1000" y2={36 + i * 34} stroke="rgba(120,155,138,0.12)" strokeWidth="1" />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={`v-${i}`} x1={40 + i * 66} y1="0" x2={40 + i * 66} y2="420" stroke="rgba(120,155,138,0.08)" strokeWidth="1" />
          ))}

          <path d="M86 90L140 74L190 88L216 120L196 154L142 158L106 138Z" fill="url(#continentGrad)" />
          <path d="M216 158L244 164L262 204L246 246L214 260L194 222Z" fill="url(#continentGrad)" />
          <path d="M426 82L468 64L526 76L584 96L620 116L602 142L536 144L482 128L444 108Z" fill="url(#continentGrad)" />
          <path d="M496 150L548 166L568 208L548 250L504 262L468 226L476 186Z" fill="url(#continentGrad)" />
          <path d="M648 92L694 72L760 88L812 114L852 146L824 166L754 160L708 138L666 120Z" fill="url(#continentGrad)" />
          <path d="M788 220L846 234L870 262L842 294L782 286L758 246Z" fill="url(#continentGrad)" />

          {leader && topHotspots.slice(1).map((p) => {
            const from = project(leader.lng, leader.lat);
            const to = project(p.lng, p.lat);
            const cx = (from.x + to.x) / 2;
            const cy = Math.min(from.y, to.y) - 36;
            return (
              <path
                key={`arc-${p.id}`}
                d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                fill="none"
                stroke="rgba(44,185,120,0.25)"
                strokeWidth="1.5"
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
