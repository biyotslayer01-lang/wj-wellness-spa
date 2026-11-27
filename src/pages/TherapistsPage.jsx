import React, { useState } from 'react';
import { UserRound, UserRoundPlus, Pencil, ChevronRight, Stethoscope } from 'lucide-react';
import { PageHeading, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api } from '../api';

export function TherapistsPage({ user, refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/therapists', refreshKey);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const managers = ['owner', 'admin'].includes(user.role);
  const therapists = data?.therapists || [];

  const open = (t = null) => {
    setEditing(t);
    setForm(t ? { name: t.name, phone: t.phone || '' } : { name: '', phone: '' });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const cleanPhone = (form.phone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 11) {
      notify('Contact number must be exactly 11 digits (e.g. 09XXXXXXXXX).', 'error');
      return;
    }
    setSaving(true);
    try {
      await api(editing ? `/api/therapists/${editing.id}` : '/api/therapists', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, phone: cleanPhone, active: editing ? editing.active : true })
      });
      notify(editing ? 'Therapist profile updated.' : 'Therapist added.');
      setShowModal(false);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      await api(`/api/therapists/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: t.name, phone: t.phone, active: !t.active })
      });
      notify(`Therapist ${t.active ? 'deactivated' : 'activated'}.`);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeading
        title="Therapist management"
        description="Keep therapist details, availability, and assigned workloads organized."
        action={managers ? () => open() : null}
        actionLabel="Add therapist"
        actionIcon={UserRoundPlus}
      />
      <div className="therapist-grid">
        {loading ? (
          <LoadingLine />
        ) : (
          therapists.map((t, i) => (
            <div className={`therapist-card ${!t.active ? 'inactive-card' : ''}`} key={t.id}>
              <div className="therapist-card-top">
                <div className={`therapist-avatar avatar-tone-${i % 5}`}>
                  <UserRound size={24} />
                </div>
                <div className="therapist-status">
                  <span className={`active-dot ${t.active ? '' : 'off'}`} />
                  {t.active ? 'Active' : 'Inactive'}
                </div>
                {managers && (
                  <button className="icon-button therapist-more" onClick={() => open(t)} title="Edit therapist">
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              <h3>{t.name}</h3>
              <p>{t.phone || 'No contact number added'}</p>
              <div className="therapist-card-bottom">
                <div>
                  <strong>{t.active_appointments || 0}</strong>
                  <span>Open appointments</span>
                </div>
                {managers && (
                  <button className="text-button" onClick={() => toggleActive(t)}>
                    {t.active ? 'Deactivate' : 'Activate'} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {error && <InlineError message={error} />}
      {!loading && !therapists.length && (
        <EmptyState icon={Stethoscope} title="No therapist profiles" description="Add the massage therapists assigned to this branch." />
      )}

      {showModal && (
        <Modal title={editing ? 'Edit therapist' : 'Add therapist'} subtitle="Keep the therapist profile up to date." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field label="Therapist name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" />
            <Field label="Contact number (11 digits)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09XXXXXXXXX" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add therapist'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
