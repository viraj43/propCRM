import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'];
const SOURCE_OPTIONS = ['WEBSITE', 'ADS', 'CALL', 'REFERRAL', 'PORTAL', 'OTHER'];

export default function LeadModal({ lead, agents, onClose, onSave }) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    budget: lead?.budget || '',
    source: lead?.source || 'WEBSITE',
    status: lead?.status || 'NEW',
    preferences: lead?.preferences || '',
    notes: lead?.notes || '',
    agentId: lead?.agentId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (lead) {
        await api.put(`/leads/${lead.id}`, form);
      } else {
        await api.post('/leads', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{lead ? 'Edit Lead' : 'Add New Lead'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@gmail.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Budget (₹)</label>
                <input className="form-input" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="5000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select className="form-select" value={form.source} onChange={e => set('source', e.target.value)}>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Agent</label>
                <select className="form-select" value={form.agentId} onChange={e => set('agentId', e.target.value)}>
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Preferences</label>
              <input className="form-input" value={form.preferences} onChange={e => set('preferences', e.target.value)} placeholder="3BHK, Mumbai, near schools, budget flexible..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this lead..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : lead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
