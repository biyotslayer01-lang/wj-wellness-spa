import React, { useState } from 'react';
import { Users, RefreshCw, UserRoundPlus, Search, Pencil } from 'lucide-react';
import { PageHeading, StatCard, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api, dateLabel } from '../api';

export function CustomersPage({ refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/customers', refreshKey);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const customers = (data?.customers || []).filter((c) =>
    `${c.full_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const open = (customer = null) => {
    setEditing(customer);
    setForm(customer ? { full_name: customer.full_name, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '' } : { full_name: '', phone: '', email: '', notes: '' });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const cleanPhone = (form.phone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 11) {
      notify('Mobile number must be exactly 11 digits (e.g. 09XXXXXXXXX).', 'error');
      return;
    }
    setSaving(true);
    try {
      await api(editing ? `/api/customers/${editing.id}` : '/api/customers', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, phone: cleanPhone })
      });
      notify(editing ? 'Customer details updated.' : 'Customer added successfully.');
      setShowModal(false);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Customer directory"
        description="A complete, searchable record of the people who visit your branch."
        action={() => open()}
        actionLabel="Add customer"
        actionIcon={UserRoundPlus}
      />
      <div className="stats-grid compact-stats">
        <StatCard label="Total customers" value={loading ? '—' : data?.customers?.length ?? 0} detail="Customer records on file" icon={Users} tone="green" />
        <StatCard label="Returning visits" value={loading ? '—' : (data?.customers || []).filter((c) => c.appointment_count > 1).length} detail="More than one appointment" icon={RefreshCw} tone="blue" />
        <StatCard label="New records" value={loading ? '—' : (data?.customers || []).filter((c) => c.appointment_count <= 1).length} detail="One or fewer appointments" icon={UserRoundPlus} tone="gold" />
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3 className="table-title">All customers</h3>
            <span className="table-subtitle">Customer details and visit activity</span>
          </div>
          <div className="toolbar-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a customer" />
          </div>
        </div>
        {error && <InlineError message={error} />}
        {loading ? (
          <LoadingLine />
        ) : customers.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>CONTACT</th>
                  <th>VISITS</th>
                  <th>ADDED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">{c.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
                        <div>
                          <div className="cell-primary">{c.full_name}</div>
                          <div className="cell-muted">Customer #{String(c.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-primary">{c.phone || '—'}</div>
                      <div className="cell-muted">{c.email || 'No email added'}</div>
                    </td>
                    <td><span className="visit-count">{c.appointment_count}</span></td>
                    <td><span className="cell-muted">{dateLabel((c.created_at || '').slice(0, 10))}</span></td>
                    <td>
                      <button className="mini-action" onClick={() => open(c)} title="Edit customer">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title="No customer records yet" description="Add a customer or receive your first online appointment request." />
        )}
      </section>

      {showModal && (
        <Modal title={editing ? 'Edit customer' : 'Add customer'} subtitle="Customer information is stored in the branch database." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field label="Full name" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Customer name" />
            <Field label="Mobile number (11 digits)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09XXXXXXXXX" />
            <Field label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@email.com" />
            <Field label="Notes" type="textarea" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Optional customer notes" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add customer'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
