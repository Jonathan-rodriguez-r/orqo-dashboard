'use client';

import { useEffect, useState } from 'react';

const DEFAULT_AGENTS = [
  { id: 'inventory', name: 'Inventario', emoji: '📦', desc: 'Consulta stock y disponibilidad de productos', instructions: 'Eres un asistente de inventario. Ayuda a los clientes a consultar disponibilidad de productos, fechas de reabastecimiento y stock actual.', enabled: true },
  { id: 'orders', name: 'Pedidos', emoji: '🛒', desc: 'Estado y seguimiento de órdenes', instructions: 'Eres un asistente de pedidos. Ayuda a los clientes a rastrear sus órdenes, entender el estado de entrega y resolver problemas con sus compras.', enabled: true },
  { id: 'reservations', name: 'Reservas', emoji: '📅', desc: 'Gestión de citas y reservaciones', instructions: 'Eres un asistente de reservas. Ayuda a los clientes a agendar, modificar o cancelar citas y reservaciones.', enabled: true },
  { id: 'support', name: 'Soporte', emoji: '🎧', desc: 'Atención al cliente y resolución de problemas', instructions: 'Eres un agente de soporte al cliente. Escucha los problemas, ofrece soluciones y escala cuando sea necesario.', enabled: true },
  { id: 'catalog', name: 'Catálogo', emoji: '🏷️', desc: 'Información de productos y precios', instructions: 'Eres un asistente de catálogo. Proporciona información detallada sobre productos, características, precios y comparativas.', enabled: false },
];

type Agent = typeof DEFAULT_AGENTS[0];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/config/agents').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) setAgents(d);
    });
  }, []);

  function toggle(id: string) {
    setAgents(prev => prev.map(a => a.id === id ? {...a, enabled: !a.enabled} : a));
  }

  function updateInstructions(id: string, val: string) {
    setAgents(prev => prev.map(a => a.id === id ? {...a, instructions: val} : a));
  }

  async function save() {
    await fetch('/api/config/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agents),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Agentes</h1>
        <p className="page-sub">Activa y personaliza los agentes de tu asistente</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div className="agent-header">
              <div className="agent-icon">{agent.emoji}</div>
              <div style={{flex:1}}>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-desc">{agent.desc}</div>
              </div>
              <div className="agent-header-right" style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span className={`badge ${agent.enabled ? 'badge-green' : 'badge-gray'}`}>
                  {agent.enabled ? 'Activo' : 'Inactivo'}
                </span>
                <label className="toggle">
                  <input type="checkbox" checked={agent.enabled} onChange={() => toggle(agent.id)}/>
                  <span className="toggle-track"/>
                  <span className="toggle-thumb"/>
                </label>
              </div>
            </div>

            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(editing === agent.id ? null : agent.id)}
              >
                {editing === agent.id ? '▲ Cerrar instrucciones' : '▼ Editar instrucciones'}
              </button>
            </div>

            {editing === agent.id && (
              <div className="field" style={{marginBottom:0}}>
                <label className="label">Instrucciones del sistema</label>
                <textarea
                  className="input"
                  rows={4}
                  value={agent.instructions}
                  onChange={e => updateInstructions(agent.id, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="save-bar">
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
