import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Phone, Mail, User } from 'lucide-react';
import api from '../services/api';
import LeadModal from '../components/LeadModal';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'];
const SOURCE_OPTIONS = ['WEBSITE', 'ADS', 'CALL', 'REFERRAL', 'PORTAL', 'OTHER'];

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState(null);

  const fetchLeads = () => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/leads', { params }).then(r => { setLeads(r.data); setLoading(false); });
  };

  useEffect(() => { fetchLeads(); }, [search, statusFilter]);
  useEffect(() => { api.get('/agents').then(r => setAgents(r.data)); }, []);

  const handleSave = () => { setShowModal(false); setEditLead(null); fetchLeads(); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    fetchLeads();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Leads</h2>
          <p className="page-subtitle">{leads.length} total leads</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Lead
        </button>
      </div>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input className="search-input" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Lead</th><th>Contact</th><th>Source</th><th>Budget</th><th>AI Score</th><th>Status</th><th>Assigned To</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">👤</div><h3>No leads found</h3><p>Add your first lead or adjust filters.</p></div></td></tr>
                ) : leads.map(lead => (
                  <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lead.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.preferences?.slice(0, 40)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}><Phone size={12} color="var(--text-muted)" />{lead.phone}</span>
                        {lead.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}><Mail size={12} color="var(--text-muted)" />{lead.email}</span>}
                      </div>
                    </td>
                    <td><span className="badge badge-new">{lead.source}</span></td>
                    <td style={{ fontWeight: 600 }}>
                      {lead.budget ? '₹' + (lead.budget >= 10000000 ? (lead.budget/10000000).toFixed(1)+'Cr' : (lead.budget/100000).toFixed(1)+'L') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${lead.score > 70 ? 'var(--success)' : lead.score > 40 ? 'var(--warning)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                          {lead.score}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                    <td>
                      {lead.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                            {lead.assignedTo.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <span style={{ fontSize: '0.8rem' }}>{lead.assignedTo.name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setEditLead(lead); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={e => handleDelete(lead.id, e)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal
          lead={editLead}
          agents={agents}
          onClose={() => { setShowModal(false); setEditLead(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
