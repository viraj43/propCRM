import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Mail, Users, Pencil, Trash2, ArrowRight } from 'lucide-react';
import api from '../services/api';
import ClientModal from '../components/ClientModal';

const TYPE_META = {
  BUYER: { cls: 'badge-buyer', hue: 200 },
  SELLER: { cls: 'badge-seller', hue: 38 },
  TENANT: { cls: 'badge-qualified', hue: 265 },
  LANDLORD: { cls: 'badge-closed', hue: 145 },
};

function Avatar({ name, size = 44 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `hsl(${hue} 38% 20%)`,
      border: `1px solid hsl(${hue} 38% 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.33, color: `hsl(${hue} 65% 72%)`,
      letterSpacing: '-0.5px',
    }}>
      {initials}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 13, color: value > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
      }}>{value}</span>
      {label}
    </span>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const fetchClients = () => {
    const params = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    api.get('/clients', { params }).then(r => { setClients(r.data); setLoading(false); });
  };

  useEffect(() => { fetchClients(); }, [search, typeFilter]);

  const handleSave = () => { setShowModal(false); setEditClient(null); fetchClients(); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this client? All their interactions will also be removed.')) return;
    await api.delete(`/clients/${id}`);
    fetchClients();
  };

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Clients</h2>
          <p className="page-subtitle">{clients.length} total client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} strokeWidth={2.5} /> Add Client
        </button>
      </div>

      <div className="page-content">
        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div className="search-wrapper">
            <Search className="search-icon" size={15} />
            <input
              className="search-input"
              placeholder="Search by name, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {['BUYER', 'SELLER', 'TENANT', 'LANDLORD'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={40} strokeWidth={1} /></div>
            <h3>No clients yet</h3>
            <p>Add your first client to get started.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {clients.map(client => {
              const tm = TYPE_META[client.type] ?? { cls: 'badge-new', hue: 200 };
              return (
                <div
                  key={client.id}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  {/* Card top accent bar */}
                  <div style={{
                    height: 3,
                    background: `hsl(${tm.hue} 65% 55%)`,
                    opacity: 0.5,
                  }} />

                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={client.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700, fontSize: 15,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {client.name}
                        </div>
                        <span className={`badge ${tm.cls}`} style={{ marginTop: 4 }}>{client.type}</span>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        <Phone size={12} strokeWidth={1.75} color="var(--text-muted)" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{client.phone}</span>
                      </span>
                      {client.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          <Mail size={12} strokeWidth={1.75} color="var(--text-muted)" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    {(client._count?.deals > 0 || client._count?.interactions > 0) && (
                      <div style={{
                        display: 'flex', gap: 16, alignItems: 'center',
                        paddingTop: 12, borderTop: '1px solid var(--border)',
                      }}>
                        <StatPill value={client._count?.deals ?? 0} label="deals" />
                        <span style={{ color: 'var(--border-md)', fontSize: 10 }}>·</span>
                        <StatPill value={client._count?.interactions ?? 0} label="interactions" />
                      </div>
                    )}
                  </div>

                  {/* Card actions footer */}
                  <div style={{
                    display: 'flex', gap: 0,
                    borderTop: '1px solid var(--border)',
                  }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, borderRadius: 0, borderRight: '1px solid var(--border)', gap: 5 }}
                      onClick={e => { e.stopPropagation(); setEditClient(client); setShowModal(true); }}
                    >
                      <Pencil size={12} strokeWidth={2} /> Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, borderRadius: 0, borderRight: '1px solid var(--border)', gap: 5 }}
                      onClick={e => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}
                    >
                      View <ArrowRight size={12} strokeWidth={2} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ borderRadius: 0, padding: '6px 14px' }}
                      onClick={e => handleDelete(client.id, e)}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ClientModal
          client={editClient}
          onClose={() => { setShowModal(false); setEditClient(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}