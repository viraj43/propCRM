import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Maximize2, DollarSign } from 'lucide-react';
import api from '../services/api';

function fmt(num) {
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
  return '₹' + num?.toLocaleString('en-IN');
}

const TYPE_ICONS = { RESIDENTIAL: '🏠', COMMERCIAL: '🏢', LAND: '🌿', INDUSTRIAL: '🏭' };

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prop, setProp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/properties/${id}`).then(r => { setProp(r.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!prop) return <div className="page-content"><div className="empty-state"><h3>Property not found</h3></div></div>;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-icon" onClick={() => navigate('/properties')}><ArrowLeft size={18} /></button>
          <div>
            <h2 className="page-title">{prop.title}</h2>
            <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{prop.location}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge badge-${prop.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>{prop.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {prop.images && prop.images.length > 0 ? (
                  <img src={`http://localhost:5000${prop.images[0]}`} alt={prop.title} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : (
                  <div style={{ fontSize: '4rem' }}>{TYPE_ICONS[prop.type] || '🏠'}</div>
                )}
                <div>
                  <div style={{ fontSize: prop.price ? '2rem' : '1.2rem', fontWeight: 800, color: prop.price ? 'var(--accent-hover)' : 'var(--text-muted)', letterSpacing: -1 }}>
                    {prop.price ? fmt(prop.price) : 'Price not listed'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${prop.type.toLowerCase()}`}>{prop.type}</span>
                    {prop.isExternal && <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>External Listing</span>}
                    {prop.size && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}><Maximize2 size={12} />{prop.size.toLocaleString()} sq ft</span>}
                  </div>
                  {prop.sourceUrl && (
                    <a href={prop.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none' }}>
                      🔗 View on {prop.sourceName || 'Source'} →
                    </a>
                  )}
                </div>
              </div>

              {prop.description && (
                <div>
                  <div className="card-title">Description</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{prop.description}</p>
                </div>
              )}

              {prop.amenities && (
                <div style={{ marginTop: 16 }}>
                  <div className="card-title">Amenities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {prop.amenities.split(',').map(a => (
                      <span key={a} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {a.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            {prop.location && (
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} color="var(--accent)" /> Location Map
                </div>
                <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="280"
                    style={{ border: 'none', display: 'block' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&q=${encodeURIComponent(prop.location)}`}
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(prop.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', marginTop: 8, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none' }}
                >
                  🗺️ View larger map →
                </a>
              </div>
            )}

            {/* Deals on this property */}
            {prop.deals?.length > 0 && (
              <div className="card">
                <div className="card-title">Deals ({prop.deals.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {prop.deals.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.client?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</div>
                      </div>
                      <span className={`badge badge-${d.stage.toLowerCase()}`}>{d.stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-title">Agent Details</div>
            {prop.agent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {prop.agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{prop.agent.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prop.agent.email}</div>
                  </div>
                </div>
                {prop.agent.phone && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>📞 {prop.agent.phone}</div>}
              </div>
            ) : <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No agent assigned</p>}

            <hr className="divider" />
            <div className="card-title">Property Info</div>
            {[
              { label: 'Listed', value: new Date(prop.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }) },
              { label: 'Last Updated', value: new Date(prop.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'long' }) },
              { label: 'Total Deals', value: prop.deals?.length || 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
