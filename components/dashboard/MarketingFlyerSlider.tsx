'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

type FlyerSlide = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
};

const BASE_SLIDES: FlyerSlide[] = [
  {
    id: 'flyer-1',
    title: 'Campana Conversion',
    subtitle: 'Lanzamiento omnicanal ORQO',
    image: '/marketing/orqo-flyer-01.svg',
  },
  {
    id: 'flyer-2',
    title: 'Segmentacion AI',
    subtitle: 'Mensajes personalizados por audiencia',
    image: '/marketing/orqo-flyer-02.svg',
  },
  {
    id: 'flyer-3',
    title: 'Flyer Pack',
    subtitle: 'Creatividades listas para publicar',
    image: '/marketing/orqo-flyer-03.svg',
  },
  {
    id: 'flyer-4',
    title: 'Marketing Kit',
    subtitle: 'Plantillas para WhatsApp y Web',
    image: '/marketing/orqo-flyer-04.svg',
  },
];

export default function MarketingFlyerSlider() {
  const [slides, setSlides] = useState<FlyerSlide[]>(BASE_SLIDES);
  const [active, setActive] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 4700);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[active] ?? slides[0];

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    if (files.length === 0) return;
    setUploading(true);
    const next: FlyerSlide[] = [];

    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (!dataUrl) continue;
      next.push({
        id: `custom-${Date.now()}-${file.name}`,
        title: 'Flyer personalizado',
        subtitle: file.name,
        image: dataUrl,
      });
    }

    if (next.length > 0) {
      setSlides((prev) => [...next, ...prev]);
      setActive(0);
      setStatus(`Se cargaron ${next.length} imagen(es) para envio.`);
      setTimeout(() => setStatus(''), 2600);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const sendCampaign = () => {
    setStatus(`Flyer "${current?.title ?? 'ORQO'}" listo para distribuir en canales.`);
    setTimeout(() => setStatus(''), 2600);
  };

  return (
    <div className="marketing-card">
      <div className="marketing-preview-wrap">
        <img className="marketing-preview-image" src={current.image} alt={current.title} />
        <div className="marketing-overlay">
          <div className="marketing-badge">Orqo marketing</div>
          <strong>{current.title}</strong>
          <span>{current.subtitle}</span>
        </div>
      </div>

      <div className="marketing-controls">
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setActive((prev) => (prev - 1 + slides.length) % slides.length)}
        >
          Prev
        </button>
        <div className="marketing-dots">
          {slides.slice(0, 8).map((slide, idx) => (
            <button
              key={slide.id}
              className={`marketing-dot${idx === active ? ' active' : ''}`}
              onClick={() => setActive(idx)}
              aria-label={`Ver slide ${idx + 1}`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setActive((prev) => (prev + 1) % slides.length)}
        >
          Next
        </button>
      </div>

      <div className="marketing-actions">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          onChange={onPickFiles}
        />
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Cargando...' : 'Cargar flyers'}
        </button>
        <button className="btn btn-primary btn-sm" type="button" onClick={sendCampaign}>
          Enviar campaña
        </button>
      </div>

      {status && <div className="marketing-status">{status}</div>}
    </div>
  );
}
