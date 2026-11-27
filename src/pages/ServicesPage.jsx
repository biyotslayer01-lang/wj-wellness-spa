import React, { useState } from 'react';
import { Plus, Pencil, ChevronRight, Flower2, Sparkles } from 'lucide-react';
import { PageHeading, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api, money } from '../api';

const SERVICE_IMAGES = {
  'back': '/samples/massage-back.jpg',
  'signature': '/samples/massage-signature.jpg',
  'premium': '/samples/massage-swedish.jpg',
  'hot stone': '/samples/massage-hotstone.jpg',
  'stone': '/samples/massage-hotstone.jpg',
  'executive': '/samples/massage-hotstone.jpg',
  'ventosa': '/samples/prod-compress.jpg',
  'deluxe': '/samples/prod-compress.jpg',
  'scrub': '/samples/massage-scrub.jpg',
  'luxury': '/samples/massage-scrub.jpg',
  'superior': '/samples/massage-spa-wellness.jpg',
  'couples': '/samples/massage-spa-wellness.jpg',
  'deep tissue': '/samples/massage-back.jpg',
  'tissue': '/samples/massage-back.jpg',
  'deep': '/samples/massage-back.jpg',
  'foot reflex': '/samples/massage-footspa.jpg',
  'foot': '/samples/massage-footspa.jpg',
  'reflex': '/samples/massage-footspa.jpg',
  'ear candling': '/samples/massage-ear-candling.jpg',
  'candling': '/samples/massage-ear-candling.jpg',
  'ear': '/samples/massage-ear-candling.jpg',
  'facial': '/samples/massage-facial-glow.jpg',
  'glow': '/samples/massage-facial-glow.jpg',
  'manicure': '/samples/massage-manicure.jpg',
  'pedicure': '/samples/massage-pedicure.jpg'
};

function getServiceImage(name = '') {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(SERVICE_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  return '/samples/massage-signature.jpg';
}

export function ServicesPage({ refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/services', refreshKey);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '0', duration_minutes: '60' });
  const [saving, setSaving] = useState(false);

  const services = data?.services || [];

  const open = (s = null) => {
    setEditing(s);
    setForm(s ? { name: s.name, description: s.description || '', price: String(s.price), duration_minutes: String(s.duration_minutes) } : { name: '', description: '', price: '0', duration_minutes: '60' });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(editing ? `/api/services/${editing.id}` : '/api/services', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          duration_minutes: Number(form.duration_minutes),
          active: editing ? editing.active : true
        })
      });
      notify(editing ? 'Service updated.' : 'Service added.');
      setShowModal(false);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    try {
      await api(`/api/services/${s.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: s.name,
          description: s.description,
          price: s.price,
          duration_minutes: s.duration_minutes,
          active: !s.active
        })
      });
      notify(`Service ${s.active ? 'hidden' : 'activated'}.`);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeading
        title="Services & pricing"
        description="Maintain your service menu and the prices used for appointment and payment records."
        action={() => open()}
        actionLabel="Add service"
        actionIcon={Plus}
      />
      <div className="service-note">
        <div className="note-icon"><Sparkles size={17} /></div>
        <p>
          <strong>Branch setup reminder:</strong> Update prices and durations to match the branch's actual approved menu before accepting live bookings.
        </p>
      </div>
      {error && <InlineError message={error} />}
      <div className="service-grid">
        {loading ? (
          <LoadingLine />
        ) : (
          services.map((s, i) => (
            <div className={`service-card ${!s.active ? 'inactive-card' : ''}`} key={s.id} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', height: '140px', width: '100%', margin: '-16px -16px 14px -16px', overflow: 'hidden' }}>
                <img
                  src={getServiceImage(s.name)}
                  alt={s.name}
                  style={{ width: 'calc(100% + 32px)', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(30,10,14,0.85) 0%, rgba(30,10,14,0.1) 60%, transparent 100%)' }} />
                <span style={{ position: 'absolute', bottom: '10px', left: '12px', background: 'rgba(136,28,45,0.88)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.04em' }}>
                  {s.active ? 'BRANCH SERVICE' : 'HIDDEN'}
                </span>
                <button
                  className="icon-button"
                  onClick={() => open(s)}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
                >
                  <Pencil size={14} />
                </button>
              </div>
              <h3 style={{ marginTop: '4px' }}>{s.name}</h3>
              <p style={{ flex: 1 }}>{s.description}</p>
              <div className="service-card-foot" style={{ marginTop: 'auto' }}>
                <div>
                  <strong>{Number(s.price) > 0 ? money(s.price) : 'Set price'}</strong>
                  <span>{s.duration_minutes} min · {s.active ? 'Available' : 'Inactive'}</span>
                </div>
                <button className="text-button" onClick={() => toggle(s)}>
                  {s.active ? 'Hide service' : 'Activate'} <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit service' : 'Add service'} subtitle="Service price and duration are used to calculate appointment end times." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field label="Service name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Signature Massage" />
            <Field label="Description" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Short service description" />
            <div className="form-grid two">
              <Field label="Price (PHP)" type="number" required value={form.price} onChange={(v) => setForm({ ...form, price: v })} hint="Enter the actual branch price." />
              <Field label="Duration (minutes)" type="number" required value={form.duration_minutes} onChange={(v) => setForm({ ...form, duration_minutes: v })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add service'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
