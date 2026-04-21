import { useEffect, useState } from 'react';
import { Plus, Search, UserCog, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ROLE_META = {
  ADMIN: { label: 'Admin', cls: 'badge-admin' },
  MANAGER: { label: 'Manager', cls: 'badge-manager' },
  AGENT: { label: 'Agent', cls: 'badge-agent' },
};

function Avatar({ name, size = 36 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: `hsl(${hue} 40% 22%)`,
      border: `1px solid hsl(${hue} 40% 32%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.33, color: `hsl(${hue} 70% 75%)`,
      letterSpacing: '-0.5px',
    }}>
      {initials}
    </div>
  );
}

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAgents = () => {
    api.get('/agents').then(r => { setAgents(r.data); setLoading(false); });
  };

  useEffect(() => { fetchAgents(); }, []);

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/auth/register', form);
      setShowRegister(false);
      setForm({ name: '', email: '', password: '', role: 'AGENT', phone: '' });
      fetchAgents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this agent? This action cannot be undone.')) return;
    await api.delete(`/agents/${id}`);
    fetchAgents();
  };

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Agents & Users</h2>
          <p className="page-subtitle">{agents.length} team member{agents.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
            <Plus size={15} strokeWidth={2.5} /> Add User
          </button>
        )}
      </div>

      <div className="page-content">
        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div className="search-wrapper">
            <Search className="search-icon" size={15} />
            <input
              className="search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'center' }}>Leads</th>
                  <th style={{ textAlign: 'center' }}>Deals</th>
                  <th style={{ textAlign: 'center' }}>Properties</th>
                  <th>Joined</th>
                  {user?.role === 'ADMIN' && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <UserCog size={36} strokeWidth={1} />
                        </div>
                        <h3>No agents found</h3>
                        <p>Try adjusting your search or add a new user.</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(agent => {
                  const rm = ROLE_META[agent.role] ?? { label: agent.role, cls: 'badge-agent' };
                  return (
                    <tr key={agent.id}>
                      {/* Agent column */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={agent.name} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                              {agent.name}
                              {agent.id === user?.id && (
                                <span style={{
                                  marginLeft: 7, fontSize: 10, fontWeight: 600,
                                  background: 'var(--accent-dim)', color: 'var(--accent)',
                                  border: '1px solid var(--accent-border)',
                                  padding: '1px 7px', borderRadius: 99,
                                  verticalAlign: 'middle',
                                  fontFamily: 'var(--font-mono)',
                                }}>you</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{agent.email}</div>
                          </div>
                        </div>
                      </td>

                      <td><span className={`badge ${rm.cls}`}>{rm.label}</span></td>

                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {agent.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      {/* Stat cells */}
                      {['leads', 'deals', 'properties'].map(key => (
                        <td key={key} style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700, fontSize: 15,
                            color: (agent._count?.[key] ?? 0) > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}>
                            {agent._count?.[key] ?? 0}
                          </span>
                        </td>
                      ))}

                      <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(agent.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      {user?.role === 'ADMIN' && (
                        <td>
                          {agent.id !== user.id && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(agent.id)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Register modal ── */}
      {showRegister && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRegister(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Register New User</h3>
              <button className="btn-icon" onClick={() => setShowRegister(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-9876543210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 6 characters" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                      {['ADMIN', 'MANAGER', 'AGENT'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRegister(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}