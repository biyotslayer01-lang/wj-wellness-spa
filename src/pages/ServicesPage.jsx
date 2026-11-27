import React, { useState } from 'react';
import { Plus, Pencil, ChevronRight, Flower2, Sparkles } from 'lucide-react';
import { PageHeading, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api, money } from '../api';

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
            <div className={`service-card ${!s.active ? 'inactive-card' : ''}`} key={s.id}>
              <div className={`service-icon service-tone-${i % 5}`}>
                <Flower2 size={22} />
              </div>
              <div className="service-card-head">
                <span className="service-category">{s.active ? 'BRANCH SERVICE' : 'HIDDEN SERVICE'}</span>
                <button className="icon-button" onClick={() => open(s)}>
                  <Pencil size={15} />
                </button>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <div className="service-card-foot">
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
