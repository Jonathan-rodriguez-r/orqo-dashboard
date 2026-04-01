'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/usePermissions';

type ClientItem = {
  _id: string;
  slug: string;
  name: string;
  status: 'active' | 'inactive';
  ownerEmail: string;
  notes: string;
  workspaceCount: number;
};

type WorkspaceItem = {
  _id: string;
  name: string;
  clientId: string;
  clientName: string;
};

export default function ClientsPage() {
  const session = useSession();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const canManage = !!session?.permissions?.includes('admin.clients');

  async function load() {
    setLoading(true);
    setErr('');
    const res = await fetch('/api/clients', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(String(data?.error ?? 'No se pudo cargar clientes'));
      setLoading(false);
      return;
    }
    setClients(Array.isArray(data?.clients) ? data.clients : []);
    setWorkspaces(Array.isArray(data?.workspaces) ? data.workspaces : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ownerEmail, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(String(data?.error ?? 'No se pudo crear cliente'));
      return;
    }
    setName('');
    setOwnerEmail('');
    setNotes('');
    setMsg('Cliente creado correctamente');
    await load();
  }

  async function toggleClientStatus(client: ClientItem) {
    const nextStatus = client.status === 'active' ? 'inactive' : 'active';
    const res = await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client._id, status: nextStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(String(data?.error ?? 'No se pudo actualizar estado'));
      return;
    }
    await load();
  }

  async function assignWorkspace(workspaceId: string, clientId: string) {
    const res = await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, workspaceId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(String(data?.error ?? 'No se pudo asignar workspace'));
      return;
    }
    await load();
  }

  if (session === undefined || loading) {
    return (
      <div className="dash-content">
        <div className="page-header">
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="dash-content">
        <div className="card">
          <div className="card-title">Acceso restringido</div>
          <p style={{ color: 'var(--g05)', fontSize: 13 }}>Solo el rol owner puede gestionar clientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <p className="page-sub">Gestion centralizada de cuentas cliente y asignacion de workspaces</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title">Nuevo cliente</div>
          <form onSubmit={createClient}>
            <div className="field-row">
              <div className="field">
                <label className="label">Nombre del cliente</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Email owner</label>
                <input className="input" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label">Notas</label>
              <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-primary" type="submit">
                Crear cliente
              </button>
              {msg ? <span style={{ color: 'var(--acc)', fontSize: 12 }}>{msg}</span> : null}
              {err ? <span style={{ color: 'var(--red)', fontSize: 12 }}>{err}</span> : null}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Tabla de clientes</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Slug</th>
                  <th>Owner</th>
                  <th>Workspaces</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--g05)', padding: 24 }}>
                      Sin clientes
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{c.slug}</td>
                      <td>{c.ownerEmail || '-'}</td>
                      <td>{c.workspaceCount}</td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => void toggleClientStatus(c)}>
                          {c.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Asignacion de cuentas (workspaces)</div>
          <p style={{ color: 'var(--g05)', fontSize: 12.5, marginBottom: 10 }}>
            Cada cuenta/workspace debe quedar asociada a un cliente.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cuenta (workspace)</th>
                  <th>Cliente actual</th>
                  <th>Reasignar a</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws._id}>
                    <td>{ws.name}</td>
                    <td>{ws.clientName || ws.clientId}</td>
                    <td>
                      <select
                        className="input"
                        value={ws.clientId}
                        onChange={(e) => void assignWorkspace(ws._id, e.target.value)}
                        style={{ minWidth: 240 }}
                      >
                        {clients.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
