import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

const TYPE_LABELS = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  LAND: 'Land',
  INDUSTRIAL: 'Industrial',
};

const STATUS_LABELS = {
  AVAILABLE: 'Available',
  SOLD: 'Sold',
  RENTED: 'Rented',
  UNDER_NEGOTIATION: 'Under Negotiation',
};

export default function PropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState({
    title: property?.title || '',
    type: property?.type || 'RESIDENTIAL',
    location: property?.location || '',
    price: property?.price || '',
    size: property?.size || '',
    amenities: property?.amenities || '',
    status: property?.status || 'AVAILABLE',
    description: property?.description || '',
    isExternal: property?.isExternal || false,
    sourceUrl: property?.sourceUrl || '',
    sourceName: property?.sourceName || '',
    snippet: property?.snippet || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When toggling isExternal, clear fields that belong to the other mode
  const handleExternalToggle = (checked) => {
    set('isExternal', checked);
    if (checked) {
      setImageFile(null);
    } else {
      set('sourceUrl', '');
      set('sourceName', '');
      set('snippet', '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key] !== null && form[key] !== undefined) {
          formData.append(key, form[key]);
        }
      });
      // Only append image if a new file was selected
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (property) {
        await api.put(`/properties/${property.id}`, formData);
      } else {
        await api.post('/properties', formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">{property ? 'Edit Property' : 'Add New Property'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* External listing toggle — must come first so fields below react to it */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="isExternal"
                checked={form.isExternal}
                onChange={e => handleExternalToggle(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="isExternal" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                External listing (sourced from a portal like 99acres, MagicBricks, etc.)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Property Title *</label>
              <input
                className="form-input"
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="3BHK Luxury Apartment - Bandra West"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹){!form.isExternal && ' *'}</label>
                <input
                  className="form-input"
                  type="number"
                  required={!form.isExternal}
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="18500000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Size (sq ft)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.size}
                  onChange={e => set('size', e.target.value)}
                  placeholder="1450"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Location{!form.isExternal && ' *'}</label>
              <input
                className="form-input"
                required={!form.isExternal}
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Bandra West, Mumbai, Maharashtra"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amenities</label>
              <input
                className="form-input"
                value={form.amenities}
                onChange={e => set('amenities', e.target.value)}
                placeholder="Swimming Pool, Gym, 24/7 Security, Parking..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Detailed property description..."
                rows={3}
              />
            </div>

            {/* Internal-only: image upload with existing image preview */}
            {!form.isExternal && (
              <div className="form-group">
                <label className="form-label">Property Image</label>
                {property?.images?.length > 0 && !imageFile && (
                  <div style={{ marginBottom: 8 }}>
                    <img
                      src={property.images[0]}
                      alt="Current property"
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e0e0e0' }}
                    />
                    <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Current image — upload a new one to replace it</p>
                  </div>
                )}
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files[0])}
                />
              </div>
            )}

            {/* External-only: source info + snippet */}
            {form.isExternal && (
              <>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Source URL</label>
                    <input
                      className="form-input"
                      value={form.sourceUrl}
                      onChange={e => set('sourceUrl', e.target.value)}
                      placeholder="https://www.99acres.com/..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source Name</label>
                    <input
                      className="form-input"
                      value={form.sourceName}
                      onChange={e => set('sourceName', e.target.value)}
                      placeholder="e.g. 99acres, MagicBricks"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Snippet</label>
                  <textarea
                    className="form-textarea"
                    value={form.snippet}
                    onChange={e => set('snippet', e.target.value)}
                    placeholder="Brief excerpt or summary from the source listing..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : property ? 'Update Property' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}