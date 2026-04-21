import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

export default function DealModal({ deal, clients, properties, onClose, onSave }) {
  const [form, setForm] = useState({
    clientId: deal?.clientId || '',
    propertyId: deal?.propertyId || '',
    stage: deal?.stage || 'INQUIRY',
    value: deal?.value || '',
    commission: deal?.commission || '',
    notes: deal?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (e) => {
    if (!deal || !e.target.files[0]) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      await api.post(`/deals/${deal.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSave(); // Refresh data
    } catch (err) {
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (deal) {
        await api.put(`/deals/${deal.id}`, form);
      } else {
        await api.post('/deals', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const stages = ['INQUIRY', 'NEGOTIATION', 'AGREEMENT', 'CLOSED', 'LOST'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">{deal ? 'Edit Deal' : 'Create New Deal'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className="form-select" required value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Property *</label>
                <select className="form-select" required value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
                  <option value="">Select Property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deal Value (₹) *</label>
                <input className="form-input" type="number" required value={form.value} onChange={e => set('value', e.target.value)} placeholder="18500000" />
              </div>
              <div className="form-group">
                <label className="form-label">Commission (₹)</label>
                <input className="form-input" type="number" value={form.commission} onChange={e => set('commission', e.target.value)} placeholder="370000" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Deal notes, negotiation details, next steps..." />
            </div>
            
            {deal && (
              <div className="form-group" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label className="form-label">Deal Documents</label>
                {deal.documents?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {deal.documents.map(d => (
                      <a key={d.id} href={`http://localhost:5000${d.url}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        📄 {d.name}
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="file" className="form-input" style={{ flex: 1 }} onChange={handleFileUpload} disabled={uploading} />
                  {uploading && <span className="loading-spinner" />}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : deal ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
