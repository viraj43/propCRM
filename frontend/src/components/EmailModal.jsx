import { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import api from '../services/api';

export default function EmailModal({ type, id, name, email, onClose, onSent }) {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentInfo, setSentInfo] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const endpoint = type === 'lead' ? `/email/lead/${id}` : `/email/client/${id}`;
      const res = await api.post(endpoint, form);
      setSentInfo(res.data);
      if (onSent) onSent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} color="var(--accent)" />
            </div>
            <div>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>Send Email</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>To: {name} &lt;{email}&gt;</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {sentInfo ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Email Sent!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              Your email to <strong>{name}</strong> was dispatched successfully.
            </p>
            {sentInfo.previewUrl && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>📬 Dev Preview (Ethereal Inbox):</p>
                <a href={sentInfo.previewUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.8rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                  {sentInfo.previewUrl}
                </a>
              </div>
            )}
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="modal-body">
              {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Property viewing schedule for next week"
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={7}
                  placeholder={`Dear ${name},\n\nI wanted to reach out regarding...`}
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 160 }}
                />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                💡 This email will be automatically logged in the interaction timeline.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ gap: 8 }}>
                {sending ? <span className="loading-spinner" /> : <><Send size={14} /> Send Email</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
