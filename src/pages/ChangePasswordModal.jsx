import React, { useState } from 'react';
import { Modal, Field } from '../components/Common';
import { api } from '../api';

export function ChangePasswordModal({ onClose, notify }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (form.new_password !== form.confirm_password) {
      notify('The new passwords do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password })
      });
      notify('Your password has been changed.');
      onClose();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change your password" subtitle="Use a unique password with at least 10 characters." onClose={onClose}>
      <form onSubmit={save} className="modal-form">
        <Field label="Current password" type="password" required value={form.current_password} onChange={(v) => setForm({ ...form, current_password: v })} />
        <Field label="New password" type="password" required value={form.new_password} onChange={(v) => setForm({ ...form, new_password: v })} hint="At least 10 characters." />
        <Field label="Confirm new password" type="password" required value={form.confirm_password} onChange={(v) => setForm({ ...form, confirm_password: v })} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving}>{saving ? 'Updating...' : 'Update password'}</button>
        </div>
      </form>
    </Modal>
  );
}
