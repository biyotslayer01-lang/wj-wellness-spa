import React, { useState } from 'react';
import { UserRoundPlus, ShieldCheck, Users, LockKeyhole, Trash2 } from 'lucide-react';
import { PageHeading, LoadingLine, InlineError, Modal, Field, ROLE_LABELS, useApiData } from '../components/Common';
import { api, dateLabel } from '../api';

export function UsersPage({ user, refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/users', refreshKey);
  const { data: therapistData } = useApiData('/api/therapists', refreshKey);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'receptionist', therapist_id: '' });
  const [saving, setSaving] = useState(false);

  const users = data?.users || [];
  const therapists = therapistData?.therapists || [];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify(form) });
      notify('User account created.');
      setShowModal(false);
      setForm({ full_name: '', email: '', password: '', role: 'receptionist', therapist_id: '' });
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (account) => {
    try {
      await api(`/api/users/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !account.active })
      });
      notify(`Account ${account.active ? 'deactivated' : 'activated'}.`);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const removeUser = async (account) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${account.full_name}?`)) return;
    try {
      await api(`/api/users/${account.id}`, { method: 'DELETE' });
      notify(`Account ${account.full_name} removed.`);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeading
        title="User access management"
        description="Create staff accounts and keep permissions aligned with each role."
        action={() => setShowModal(true)}
        actionLabel="Create user account"
        actionIcon={UserRoundPlus}
      />
      <div className="security-banner">
        <div className="security-banner-icon"><ShieldCheck size={20} /></div>
        <div>
          <strong>Role-based access is enabled</strong>
          <p>Owner and administrator accounts manage system settings. Receptionists handle customer operations. Therapists can view their own assigned appointments only.</p>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3 className="table-title">System users</h3>
            <span className="table-subtitle">Accounts with access to the management workspace</span>
          </div>
          <span className="user-count"><Users size={15} /> {users.length} accounts</span>
        </div>
        {error && <InlineError message={error} />}
        {loading ? (
          <LoadingLine />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>LINKED THERAPIST</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="cell-primary">{account.full_name}</div>
                      <div className="cell-muted">{account.email}</div>
                    </td>
                    <td>
                      <span className={`role-pill role-${account.role}`}>
                        {ROLE_LABELS[account.role]}
                      </span>
                    </td>
                    <td>{account.therapist_name || '—'}</td>
                    <td>
                      <span className={`account-status ${account.active ? 'enabled' : 'disabled'}`}>
                        <i />{account.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><span className="cell-muted">{dateLabel((account.created_at || '').slice(0, 10))}</span></td>
                    <td>
                      {account.role !== 'owner' && account.id !== user.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className={`text-button ${account.active ? 'danger-text' : ''}`}
                            onClick={() => toggle(account)}
                          >
                            {account.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="text-button danger-text"
                            onClick={() => removeUser(account)}
                            title="Delete user"
                            style={{ color: '#c62828' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="cell-muted">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="security-footnote">
        <LockKeyhole size={15} /> Passwords are securely hashed in the database. User accounts are not allowed to view or retrieve another user's password.
      </div>

      {showModal && (
        <Modal title="Create staff account" subtitle="Use a unique email address and a strong temporary password." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field label="Full name" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Staff member's name" />
            <Field label="Email address" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@2hands.com" />
            <Field label="Temporary password" type="password" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 10 characters" hint="Share securely and ask the user to change it after first sign-in." />
            <Field
              label="Access role"
              type="select"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v, therapist_id: '' })}
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'receptionist', label: 'Receptionist' },
                { value: 'therapist', label: 'Massage Therapist' }
              ]}
            />
            <Field
              label="Linked therapist profile"
              type="select"
              value={form.therapist_id}
              onChange={(v) => setForm({ ...form, therapist_id: v })}
              options={therapists.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder="Select a therapist"
              disabled={form.role !== 'therapist'}
              hint={form.role === 'therapist' ? 'Required for therapist accounts.' : 'Only required for therapist accounts.'}
            />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Creating...' : 'Create account'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
