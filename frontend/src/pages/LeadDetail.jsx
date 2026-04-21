import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, CheckCircle, Circle, Plus, User } from 'lucide-react';
import api from '../services/api';
import LeadModal from '../components/LeadModal';
import EmailModal from '../components/EmailModal';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ scheduledAt: '', note: '' });

  const fetch = () => {
    api.get(`/leads/${id}`).then(r => { setLead(r.data); setLoading(false); });
  };

  useEffect(() => { fetch(); api.get('/agents').then(r => setAgents(r.data)); }, [id]);

  const toggleFollowUp = async (fid, isDone) => {
    await api.put(`/leads/${id}/followups/${fid}`, { isDone: !isDone });
    fetch();
  };

  const addFollowUp = async (e) => {
    e.preventDefault();
    await api.post(`/leads/${id}/followups`, followUpForm);
    setShowFollowUp(false);
    setFollowUpForm({ scheduledAt: '', note: '' });
    fetch();
  };

  const statusColors = { NEW: 'badge-new', CONTACTED: 'badge-contacted', QUALIFIED: 'badge-qualified', CLOSED: 'badge-closed', LOST: 'badge-lost' };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!lead) return <div className="page-content"><div className="empty-state"><h3>Lead not found</h3></div></div>;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-icon" onClick={() => navigate('/leads')}><ArrowLeft size={18} /></button>
          <div>
            <h2 className="page-title">{lead.name}</h2>
            <p className="page-subtitle">Lead Details & Follow-ups</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>AI SCORE</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: lead.score > 70 ? 'var(--success)' : lead.score > 40 ? 'var(--warning)' : 'var(--danger)' }}>{lead.score}</span>
          </div>
          <span className={`badge ${statusColors[lead.status]}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>{lead.status}</span>
          {lead.email && (
            <button className="btn btn-secondary" onClick={() => setShowEmail(true)}>
              <Mail size={15} /> Email
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowEdit(true)}>Edit Lead</button>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Lead Info */}
          <div className="card">
            <div className="card-title">Lead Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Phone', value: lead.phone, icon: Phone },
                { label: 'Email', value: lead.email || '—', icon: Mail },
                { label: 'Source', value: lead.source },
                { label: 'Budget', value: lead.budget ? '₹' + (lead.budget >= 10000000 ? (lead.budget/10000000).toFixed(1)+'Cr' : (lead.budget/100000).toFixed(1)+'L') : '—' },
                { label: 'Assigned To', value: lead.assignedTo?.name || 'Unassigned', icon: User },
                { label: 'Created', value: new Date(lead.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }), icon: Calendar },
                { label: 'Lead Quality', value: lead.score > 70 ? 'Hot Lead 🔥' : lead.score > 40 ? 'Warm Lead ⚡' : 'Cold Lead 🧊' },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 90, paddingTop: 2 }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{Icon ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} color="var(--accent)" />{value}</span> : value}</span>
                </div>
              ))}
              {lead.preferences && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Preferences</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>{lead.preferences}</div>
                </div>
              )}
              {lead.notes && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>{lead.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Follow-ups ({lead.followUps?.length || 0})</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowFollowUp(!showFollowUp)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {showFollowUp && (
              <form onSubmit={addFollowUp} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time</label>
                  <input type="datetime-local" className="form-input" required value={followUpForm.scheduledAt} onChange={e => setFollowUpForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Note</label>
                  <input className="form-input" placeholder="Follow-up details..." value={followUpForm.note} onChange={e => setFollowUpForm(f => ({ ...f, note: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFollowUp(false)}>Cancel</button>
                </div>
              </form>
            )}

            {lead.followUps?.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">📅</div><h3>No follow-ups</h3><p>Schedule a follow-up reminder.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lead.followUps.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: `1px solid ${f.isDone ? 'var(--success)' : new Date(f.scheduledAt) < new Date() ? 'var(--danger)' : 'var(--border)'}`, opacity: f.isDone ? 0.6 : 1 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.isDone ? 'var(--success)' : 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} onClick={() => toggleFollowUp(f.id, f.isDone)}>
                      {f.isDone ? <CheckCircle size={18} /> : <Circle size={18} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: f.isDone ? 'line-through' : 'none' }}>{f.note || 'Follow-up scheduled'}</div>
                      <div style={{ fontSize: '0.75rem', color: new Date(f.scheduledAt) < new Date() && !f.isDone ? 'var(--danger)' : 'var(--text-muted)', marginTop: 4 }}>
                        <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(f.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        {new Date(f.scheduledAt) < new Date() && !f.isDone && ' • Overdue'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <LeadModal
          lead={lead}
          agents={agents}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); fetch(); }}
        />
      )}
      {showEmail && lead.email && (
        <EmailModal
          type="lead"
          id={lead.id}
          name={lead.name}
          email={lead.email}
          onClose={() => setShowEmail(false)}
          onSent={() => fetch()}
        />
      )}
    </>
  );
}
