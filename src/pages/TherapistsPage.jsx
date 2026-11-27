import React, { useState } from 'react';
import { UserRound, UserRoundPlus, Pencil, ChevronRight, Stethoscope, UserX, UserCheck } from 'lucide-react';
import { PageHeading, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api } from '../api';

export function TherapistsPage({ user, refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/therapists', refreshKey);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', gender: 'female' });
  const [saving, setSaving] = useState(false);
  const [togglingAttendance, setTogglingAttendance] = useState(null);

  const managers = ['owner', 'admin'].includes(user.role);
  const staff = ['owner', 'admin', 'receptionist'].includes(user.role);
  const therapists = data?.therapists || [];

  const open = (t = null) => {
    setEditing(t);
    setForm(t ? { name: t.name, phone: t.phone || '', gender: t.gender || 'female' } : { name: '', phone: '', gender: 'female' });
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
        body: JSON.stringify({ ...form, phone: cleanPhone, active: editing ? editing.active : true, is_absent: editing ? editing.is_absent : 0 })
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

  const toggleAttendance = async (t) => {
    setTogglingAttendance(t.id);
    try {
      const res = await api(`/api/therapists/${t.id}/attendance`, {
        method: 'PATCH',
        body: JSON.stringify({ is_absent: !t.is_absent })
      });
      notify(res.message);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setTogglingAttendance(null);
    }
  };

  const toggleActive = async (t) => {
    try {
      await api(`/api/therapists/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: t.name, phone: t.phone, gender: t.gender, active: !t.active, is_absent: t.is_absent })
      });
      notify(`Therapist ${t.active ? 'deactivated' : 'activated'}.`);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const femaleTherapists = therapists.filter((t) => t.gender === 'female' || !t.gender);
  const maleTherapists = therapists.filter((t) => t.gender === 'male');

  const renderTherapistCard = (t, i) => (
    <div className={`therapist-card ${!t.active ? 'inactive-card' : ''} ${t.is_absent ? 'absent-therapist-card' : ''}`} key={t.id} style={{
      border: t.is_absent ? '1.5px solid #e53935' : (t.gender === 'male' ? '1.5px solid rgba(27, 94, 140, 0.25)' : '1.5px solid rgba(136, 28, 45, 0.25)'),
      position: 'relative',
      background: t.is_absent ? 'rgba(229, 57, 53, 0.03)' : 'var(--card-bg, #ffffff)'
    }}>
      <div className="therapist-card-top">
        <div className={`therapist-avatar avatar-tone-${i % 5}`} style={{
          background: t.gender === 'male' ? 'rgba(27, 94, 140, 0.12)' : 'rgba(136, 28, 45, 0.12)',
          color: t.gender === 'male' ? '#1b5e8c' : '#881c2d'
        }}>
          <UserRound size={24} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Boolean(t.is_absent) ? (
            <span style={{
              background: '#e53935',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em'
            }}>
              ABSENT
            </span>
          ) : (
            <span style={{
              background: '#2e7d32',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em'
            }}>
              PRESENT
            </span>
          )}
        </div>
        {managers && (
          <button className="icon-button therapist-more" onClick={() => open(t)} title="Edit therapist">
            <Pencil size={15} />
          </button>
        )}
      </div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '8px', marginBottom: '2px' }}>{t.name}</h3>
      <p style={{ fontSize: '0.82rem', color: '#7a6064', marginBottom: '12px' }}>
        {t.phone || 'No phone number'} <span>·</span> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{t.gender || 'female'}</span>
      </p>

      {/* QUICK ATTENDANCE BUTTON */}
      {staff && (
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => toggleAttendance(t)}
            disabled={togglingAttendance === t.id}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: t.is_absent ? '1.5px solid #2e7d32' : '1.5px solid #e53935',
              background: t.is_absent ? '#e8f5e9' : '#ffebee',
              color: t.is_absent ? '#1b5e20' : '#b71c1c',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {t.is_absent ? <UserCheck size={16} /> : <UserX size={16} />}
            {t.is_absent ? 'Mark as PRESENT' : 'Mark as ABSENT'}
          </button>
        </div>
      )}

      <div className="therapist-card-bottom" style={{ borderTop: '1px solid var(--border-color, #eee)', paddingTop: '10px' }}>
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
  );

  return (
    <>
      <PageHeading
        title="Therapist management"
        description="Manage therapist profiles, gender rosters, and live attendance (Mark ABSENT/PRESENT)."
        action={managers ? () => open() : null}
        actionLabel="Add therapist"
        actionIcon={UserRoundPlus}
      />
      
      {loading ? (
        <LoadingLine />
      ) : (
        <>
          {/* Female Therapists Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.25rem' }}>🌸</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-color, #2b1115)', letterSpacing: '0.02em', margin: 0 }}>
                Female Therapists ({femaleTherapists.length})
              </h2>
            </div>
            <div className="therapist-grid">
              {femaleTherapists.map((t, i) => renderTherapistCard(t, i))}
            </div>
          </div>

          {/* Male Therapists Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.25rem' }}>🌿</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-color, #2b1115)', letterSpacing: '0.02em', margin: 0 }}>
                Male Therapists ({maleTherapists.length})
              </h2>
            </div>
            <div className="therapist-grid">
              {maleTherapists.map((t, i) => renderTherapistCard(t, i))}
            </div>
          </div>
        </>
      )}

      {error && <InlineError message={error} />}
      {!loading && !therapists.length && (
        <EmptyState icon={Stethoscope} title="No therapist profiles" description="Add the massage therapists assigned to this branch." />
      )}

      {showModal && (
        <Modal title={editing ? 'Edit therapist' : 'Add therapist'} subtitle="Keep the therapist profile up to date." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field label="Therapist name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name (e.g. STEPHEN, QUEEN)" />
            <Field label="Gender" type="select" required value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
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
