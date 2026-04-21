import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MessageSquare,
  PhoneCall, Calendar, Building2, Plus, X
} from 'lucide-react';
import api from '../services/api';
import EmailModal from '../components/EmailModal';

const INTERACTION_META = {
  CALL: { Icon: PhoneCall, color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
  EMAIL: { Icon: Mail, color: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
  VISIT: { Icon: Building2, color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  MEETING: { Icon: Calendar, color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)' },
  NOTE: { Icon: MessageSquare, color: 'var(--text-secondary)', bg: 'var(--bg-input)', border: 'var(--border-md)' },
};

function fmt(num) {
  if (!num) return '₹0';
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + ' L';
  return '₹' + num.toLocaleString('en-IN');
}

function Avatar({ name, size = 52 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: `hsl(${hue} 38% 20%)`,
      border: `1px solid hsl(${hue} 38% 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.32, color: `hsl(${hue} 65% 72%)`,
    }}>
      {initials}
    </div>
  );
}

function InfoRow({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
      <Icon size={14} strokeWidth={1.75} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      {children}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [intForm, setIntForm] = useState({ type: 'CALL', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/clients/${id}`).then(r => { setClient(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  const addInteraction = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.post(`/clients/${id}/interactions`, intForm);
    setSaving(false);
    setShowInteraction(false);
    setIntForm({ type: 'CALL', note: '' });
    load();
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!client) return <div className="page-content"><div className="empty-state"><h3>Client not found</h3></div></div>;

  const typeCls = `badge-${client.type.toLowerCase()}`;

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-icon" onClick={() => navigate('/clients')}>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <Avatar name={client.name} />
          <div>
            <h2 className="page-title" style={{ marginBottom: 4 }}>{client.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${typeCls}`}>{client.type}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {client.interactions?.length ?? 0} interaction{client.interactions?.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {client.email && (
            <button className="btn btn-ghost" onClick={() => setShowEmail(true)}>
              <Mail size={14} strokeWidth={1.75} /> Send Email
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Contact card */}
            <div className="card">
              <div className="card-title">Contact Info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow icon={Phone}>{client.phone}</InfoRow>
                {client.email && <InfoRow icon={Mail}>{client.email}</InfoRow>}
                {client.notes && (
                  <div style={{
                    marginTop: 8, padding: '11px 13px',
                    background: 'var(--bg-input)', borderRadius: 8,
                    fontSize: 13.5, color: 'var(--text-secondary)',
                    borderLeft: '2px solid var(--accent)',
                    lineHeight: 1.6,
                  }}>
                    {client.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Deals card */}
            {client.deals?.length > 0 && (
              <div className="card">
                <div className="card-title">Deals ({client.deals.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {client.deals.map((d, i) => (
                    <div key={d.id} style={{
                      padding: '12px 0',
                      borderBottom: i < client.deals.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {d.property?.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.agent?.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700,
                          color: 'var(--accent)', fontSize: 14, marginBottom: 4,
                        }}>
                          {fmt(d.value)}
                        </div>
                        <span className={`badge badge-${d.stage.toLowerCase()}`}>{d.stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: timeline ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Interaction Timeline</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowInteraction(v => !v)}
              >
                <Plus size={13} strokeWidth={2.5} /> Log Interaction
              </button>
            </div>

            {/* Inline log form */}
            {showInteraction && (
              <div style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-md)',
                borderRadius: 10, padding: 16, marginBottom: 24,
              }}>
                <form onSubmit={addInteraction}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">Type</label>
                      <select
                        className="form-select"
                        value={intForm.type}
                        onChange={e => setIntForm(f => ({ ...f, type: e.target.value }))}
                      >
                        {Object.keys(INTERACTION_META).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Note *</label>
                    <textarea
                      className="form-textarea"
                      required
                      rows={2}
                      value={intForm.note}
                      onChange={e => setIntForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="What happened in this interaction?"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : 'Save'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowInteraction(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Timeline */}
            {(!client.interactions || client.interactions.length === 0) ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-state-icon"><MessageSquare size={32} strokeWidth={1} /></div>
                <h3>No interactions yet</h3>
                <p>Log your first interaction with this client.</p>
              </div>
            ) : (
              <div className="timeline">
                {client.interactions.map((int, i) => {
                  const meta = INTERACTION_META[int.type] ?? INTERACTION_META.NOTE;
                  const { Icon } = meta;
                  return (
                    <div key={int.id} className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        <Icon size={13} strokeWidth={1.75} color={meta.color} />
                      </div>
                      {i < client.interactions.length - 1 && <div className="timeline-line" />}
                      <div className="timeline-content">
                        <div style={{ marginBottom: 5 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: meta.color,
                            textTransform: 'uppercase', letterSpacing: '0.8px',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {int.type}
                          </span>
                        </div>
                        <div className="timeline-text">{int.note}</div>
                        <div className="timeline-time">
                          {new Date(int.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEmail && client.email && (
        <EmailModal
          type="client"
          id={client.id}
          name={client.name}
          email={client.email}
          onClose={() => setShowEmail(false)}
          onSent={load}
        />
      )}
    </>
  );
}