'use client';

import { useEffect, useState } from 'react';

type User = {
  _id: string;
  email: string;
  name: string;
  role: string;
  lastLogin?: number;
  createdAt?: number;
};

function relTime(ts?: number | null) {
  if (!ts) return 'Nunca';
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('viewer');
  const [adding, setAdding] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function load() {
    fetch('/api/users').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setUsers(d);
    });
  }

  useEffect(load, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setErrMsg(''); setSuccessMsg('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) { setErrMsg(data.error); } else {
      setSuccessMsg(`${email} agregado correctamente`);
      setEmail(''); setName(''); setRole('viewer');
      load();
    }
    setAdding(false);
  }

  async function removeUser(userEmail: string) {
    if (!confirm(`¿Eliminar a ${userEmail}?`)) return;
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); } else { load(); }
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Acceso al Dashboard</h1>
        <p className="page-sub">Gestiona quién puede iniciar sesión en el dashboard</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

        {/* Add user form */}
        <div className="card">
          <div className="card-title">Agregar usuario</div>
          <form onSubmit={addUser}>
            <div className="field-row">
              <div className="field">
                <label className="label">Correo electrónico</label>
                <input
                  className="input"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label">Nombre</label>
                <input
                  className="input"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="field" style={{maxWidth:'160px'}}>
                <label className="label">Rol</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            {errMsg && <div style={{color:'var(--red)',fontSize:'12.5px',marginBottom:'12px'}}>{errMsg}</div>}
            {successMsg && <div style={{color:'var(--acc)',fontSize:'12.5px',marginBottom:'12px'}}>✓ {successMsg}</div>}
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Agregando…' : '+ Agregar usuario'}
            </button>
          </form>
        </div>

        {/* Users table */}
        <div className="card">
          <div className="card-title">Usuarios con acceso ({users.length})</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Último acceso</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign:'center',color:'var(--g05)',padding:'32px'}}>Sin usuarios</td></tr>
                ) : users.map(u => (
                  <tr key={u._id}>
                    <td style={{color:'var(--g07)',fontWeight:500}}>{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-green' : 'badge-gray'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{relTime(u.lastLogin)}</td>
                    <td style={{fontSize:'12px',color:'var(--g05)'}}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeUser(u.email)}
                      >
                        Eliminar
                      </button>
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
