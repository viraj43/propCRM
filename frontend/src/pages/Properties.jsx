import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Maximize2, Sparkles, X } from 'lucide-react';
import api, { BASE_URL } from '../services/api';
import PropertyModal from '../components/PropertyModal';

function fmt(num) {
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
  return '₹' + num?.toLocaleString('en-IN');
}

const TYPE_ICONS = { RESIDENTIAL: '🏠', COMMERCIAL: '🏢', LAND: '🌿', INDUSTRIAL: '🏭' };

export default function Properties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProp, setEditProp] = useState(null);
  const [aiSearch, setAiSearch] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchProperties = () => {
    const params = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    api.get('/properties', { params }).then(r => { setProperties(r.data); setLoading(false); });
  };

  useEffect(() => { fetchProperties(); }, [search, typeFilter, statusFilter]);

  const handleSave = () => { setShowModal(false); setEditProp(null); fetchProperties(); };
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this property?')) return;
    await api.delete(`/properties/${id}`);
    fetchProperties();
  };

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiSearch.trim()) return;
    setAiLoading(true);
    try {
      const r = await api.get(`/properties/ai-search?q=${encodeURIComponent(aiSearch)}`);
      setAiResults(r.data);
    } catch {
      setAiResults({ error: 'AI search unavailable. Please add your Keiro API key.' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Properties</h2>
          <p className="page-subtitle">{properties.length} listings</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      <div className="page-content">
        {/* AI Search */}
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-hover)' }}>AI Market Research</span>
            <span style={{ fontSize: '0.7rem', background: 'var(--accent-glow)', color: 'var(--accent-hover)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Powered by Keiro</span>
          </div>
          <form onSubmit={handleAiSearch} style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" style={{ flex: 1 }} placeholder="e.g. 'real estate market trends Mumbai 2024' or 'commercial property BKC rates'" value={aiSearch} onChange={e => setAiSearch(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={aiLoading}>
              {aiLoading ? <span className="loading-spinner" /> : <><Sparkles size={14} /> Search</>}
            </button>
          </form>
          {aiResults && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-hover)' }}>Results for: "{aiResults.query}"</span>
                <button className="btn-icon" onClick={() => setAiResults(null)}><X size={14} /></button>
              </div>
              {aiResults.error ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{aiResults.error}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {aiResults.results?.results?.map((res, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <a href={res.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: 'var(--accent-hover)', textDecoration: 'none', marginBottom: '6px', display: 'block' }}>
                            {res.title}
                          </a>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {res.snippet}
                          </p>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => {
                          const sourceName = res.title.split(' - ').pop() || '';
                          setEditProp({
                            title: res.title.split(' - ')[0] || res.title,
                            description: res.snippet || '',
                            snippet: res.snippet || '',
                            isExternal: true,
                            sourceUrl: res.url,
                            sourceName: sourceName,
                          });
                          setShowModal(true);
                        }}>
                          <Plus size={14} style={{ marginRight: 4 }}/> Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input className="search-input" placeholder="Search by title, location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'INDUSTRIAL'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_NEGOTIATION'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <div className="property-grid">
            {properties.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-state-icon">🏠</div>
                <h3>No properties found</h3>
                <p>Add your first property listing.</p>
              </div>
            ) : properties.map(p => (
              <div key={p.id} className="property-card" onClick={() => navigate(`/properties/${p.id}`)}>
                {p.images && p.images.length > 0 ? (
                  <img src={`${BASE_URL}${p.images[0]}`} alt={p.title} className="property-image" />
                ) : (
                  <div className="property-image" style={{ fontSize: '3.5rem' }}>{TYPE_ICONS[p.type] || '🏠'}</div>
                )}
                <div className="property-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span className={`badge badge-${p.type.toLowerCase()}`}>{p.type}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.isExternal && <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>EXT</span>}
                      <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="property-title">{p.title}</div>
                  {p.location
                    ? <div className="property-location"><MapPin size={12} />{p.location}</div>
                    : p.sourceUrl && <div className="property-location" style={{ color: 'var(--accent)' }}>🔗 {p.sourceName || 'External Source'}</div>}
                  <div className="property-price">{p.price ? fmt(p.price) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Price not listed</span>}</div>
                  <div className="property-meta">
                    {p.size && <span className="property-meta-item"><Maximize2 size={12} />{p.size.toLocaleString()} sq ft</span>}
                    <span className="property-meta-item">👤 {p.agent?.name || 'No agent'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); setEditProp(p); setShowModal(true); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={e => handleDelete(p.id, e)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PropertyModal
          property={editProp}
          onClose={() => { setShowModal(false); setEditProp(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
