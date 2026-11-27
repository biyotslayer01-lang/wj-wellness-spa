import React, { useState } from 'react';
import {
  CalendarDays, Clock3, BadgeCheck, Search, Check, X, ArrowRight,
  Pencil, CheckCircle2, LayoutGrid, List, Bell
} from 'lucide-react';
import {
  PageHeading, StatusPill, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData
} from '../components/Common';
import { api, dateLabel, money, titleCase, todayString } from '../api';

export function AppointmentsPage({ user, refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/appointments', refreshKey);
  const { data: customersData } = useApiData('/api/customers', refreshKey);
  const { data: serviceData } = useApiData('/api/services', refreshKey);
  const { data: therapistData } = useApiData('/api/therapists', refreshKey);

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'timeline'
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(todayString());
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    service_id: '',
    therapist_id: '',
    appointment_date: todayString(),
    start_time: '14:00',
    source: 'staff',
    notes: ''
  });
  const [editForm, setEditForm] = useState({
    service_id: '',
    therapist_id: '',
    appointment_date: todayString(),
    start_time: '14:00',
    status: 'pending',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const canManage = ['owner', 'admin', 'receptionist'].includes(user.role);
  const rawAppointments = data?.appointments || [];
  const appointments = rawAppointments.filter((a) =>
    (filter === 'all' || a.status === filter) &&
    `${a.customer_name} ${a.service_name} ${a.therapist_name || ''}`.toLowerCase().includes(search.toLowerCase())
  );
  const customers = customersData?.customers || [];
  const services = (serviceData?.services || []).filter((s) => s.active);
  const therapists = (therapistData?.therapists || []).filter((t) => t.active !== 0);

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify(form) });
      notify('Appointment added to the schedule.');
      setShowModal(false);
      setForm({
        customer_id: '',
        service_id: '',
        therapist_id: '',
        appointment_date: todayString(),
        start_time: '14:00',
        source: 'staff',
        notes: ''
      });
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateAppointment = async (id, payload) => {
    try {
      await api(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      notify('Appointment updated.');
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const setTherapist = async (item, value) => updateAppointment(item.id, { therapist_id: value || null });

  const openEdit = (item) => {
    setEditingAppointment(item);
    setEditForm({
      service_id: String(item.service_id),
      therapist_id: item.therapist_id ? String(item.therapist_id) : '',
      appointment_date: item.appointment_date,
      start_time: item.start_time,
      status: item.status,
      notes: item.notes || ''
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/appointments/${editingAppointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          service_id: Number(editForm.service_id),
          therapist_id: editForm.therapist_id ? Number(editForm.therapist_id) : null,
          appointment_date: editForm.appointment_date,
          start_time: editForm.start_time,
          status: editForm.status,
          notes: editForm.notes
        })
      });
      notify('Appointment schedule and details updated.');
      setEditingAppointment(null);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [remindingId, setRemindingId] = useState(null);

  const remindCustomer = async (item) => {
    setRemindingId(item.id);
    try {
      const res = await api(`/api/appointments/${item.id}/remind`, { method: 'POST' });
      notify(res.message);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setRemindingId(null);
    }
  };

  // Timeline view appointments by therapist for the selected date
  const timelineAppointments = rawAppointments.filter((a) => a.appointment_date === selectedTimelineDate);

  return (
    <>
      <PageHeading
        title="Appointments & scheduling"
        description="Review customer requests, assign therapists, and keep every booking on track."
        action={canManage ? () => setShowModal(true) : null}
        actionLabel="Add appointment"
      />

      <div className="summary-strip">
        <div><CalendarDays size={17} /><span><strong>{rawAppointments.length}</strong> total records</span></div>
        <div><Clock3 size={17} /><span><strong>{rawAppointments.filter((a) => a.status === 'pending').length}</strong> pending review</span></div>
        <div><BadgeCheck size={17} /><span><strong>{rawAppointments.filter((a) => a.status === 'confirmed').length}</strong> confirmed</span></div>
      </div>

      <div className="view-toggle-bar">
        <button
          className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <List size={16} /> Table List
        </button>
        <button
          className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
          onClick={() => setViewMode('timeline')}
        >
          <LayoutGrid size={16} /> Therapist Daily Timeline
        </button>
      </div>

      {viewMode === 'list' ? (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div className="filter-tabs">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  className={filter === status ? 'selected' : ''}
                  onClick={() => setFilter(status)}
                >
                  {titleCase(status)}
                </button>
              ))}
            </div>
            <div className="toolbar-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search appointments" />
            </div>
          </div>
          {error && <InlineError message={error} />}
          {loading ? (
            <LoadingLine />
          ) : appointments.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>SERVICE</th>
                    <th>DATE & TIME</th>
                    <th>THERAPIST</th>
                    <th>STATUS</th>
                    <th>PAYMENT</th>
                    {canManage && <th>ACTION</th>}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-primary">{item.customer_name}</div>
                        <div className="cell-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{item.customer_phone || 'No phone'}</span>
                          {item.customer_email && <small style={{ color: '#276949', fontWeight: 600 }}>· {item.customer_email}</small>}
                        </div>
                        {item.reminded_at && (
                          <div style={{ marginTop: '3px' }}>
                            <span style={{ fontSize: '0.76rem', background: '#dceee2', color: '#1a5035', padding: '2px 7px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Bell size={11} /> Called ({item.reminded_at.slice(11, 16)})
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #dce7df' }}>
                            <img
                              src={`/samples/${(item.service_name || '').toLowerCase().includes('foot') ? 'massage-footspa.jpg' : (item.service_name || '').toLowerCase().includes('swedish') || (item.service_name || '').toLowerCase().includes('aromatherapy') ? 'massage-swedish.jpg' : (item.service_name || '').toLowerCase().includes('facial') ? 'massage-facial.jpg' : (item.service_name || '').toLowerCase().includes('manicure') ? 'massage-manicure.jpg' : (item.service_name || '').toLowerCase().includes('pedicure') ? 'massage-pedicure.jpg' : 'massage-signature.jpg'}`}
                              alt={item.service_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <div className="cell-primary">{item.service_name}</div>
                            <div className="cell-muted">{money(item.service_price)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-primary">{dateLabel(item.appointment_date)}</div>
                        <div className="cell-muted">{item.start_time} – {item.end_time}</div>
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            className="table-select"
                            value={item.therapist_id || ''}
                            onChange={(e) => setTherapist(item, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {therapists.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="cell-primary">{item.therapist_name || 'Unassigned'}</span>
                        )}
                      </td>
                      <td><StatusPill status={item.status} /></td>
                      <td>
                        {item.is_paid ? (
                          <span className="paid-tag"><CheckCircle2 size={13} /> Paid</span>
                        ) : (
                          <span className="unpaid-tag">Unpaid</span>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          <div className="action-row">
                            {['confirmed', 'pending'].includes(item.status) && (
                              <button
                                className="mini-action"
                                onClick={() => remindCustomer(item)}
                                disabled={remindingId === item.id}
                                title="Sila Na Po / Send Turn Reminder via Gmail & SMS"
                                style={{
                                  background: item.reminded_at ? '#edf6f0' : '#f0f7f2',
                                  color: '#1a5438',
                                  borderColor: '#b3d4be',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <Bell size={13} />
                                <span>{remindingId === item.id ? '...' : 'Sila na'}</span>
                              </button>
                            )}
                            {item.status === 'pending' && (
                              <button
                                className="mini-action confirm"
                                onClick={() => updateAppointment(item.id, { status: 'confirmed', therapist_id: item.therapist_id })}
                                title="Confirm appointment"
                              >
                                <Check size={15} />
                              </button>
                            )}
                            {item.status === 'confirmed' && (
                              <button
                                className="mini-action"
                                onClick={() => updateAppointment(item.id, { status: 'completed' })}
                                title="Mark completed"
                              >
                                <BadgeCheck size={15} />
                              </button>
                            )}
                            {!['cancelled', 'completed'].includes(item.status) && (
                              <button
                                className="mini-action danger"
                                onClick={() => updateAppointment(item.id, { status: 'cancelled' })}
                                title="Cancel appointment"
                              >
                                <X size={15} />
                              </button>
                            )}
                            <button
                              className="mini-action"
                              onClick={() => openEdit(item)}
                              title="Edit / Reschedule"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No appointments found" description="Try another filter or add a new appointment to get started." />
          )}
        </section>
      ) : (
        <section className="panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#173b32' }}>Therapist Daily Schedule Timeline</h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#687970' }}>View simultaneous therapist bookings across time slots</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select date:</span>
              <input
                type="date"
                value={selectedTimelineDate}
                onChange={(e) => setSelectedTimelineDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #c8d6cc' }}
              />
            </div>
          </div>

          <div className="schedule-timeline-container">
            {therapists.map((t) => {
              const assigned = timelineAppointments.filter((a) => a.therapist_id === t.id);
              return (
                <div className="therapist-timeline-column" key={t.id}>
                  <div className="timeline-col-header">
                    <h4>{t.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: '#556b5e', fontWeight: 600 }}>
                      {assigned.length} booking{assigned.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="timeline-slots">
                    {assigned.length ? (
                      assigned.map((app) => (
                        <div className={`timeline-appointment-card ${app.status}`} key={app.id}>
                          <div className="timeline-time-badge">
                            <Clock3 size={13} /> {app.start_time} – {app.end_time}
                          </div>
                          <div className="timeline-cust-name">{app.customer_name}</div>
                          <div className="timeline-svc-name">{app.service_name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <StatusPill status={app.status} />
                              {app.reminded_at && (
                                <span style={{ fontSize: '0.74rem', color: '#1b5037', fontWeight: 800 }}>
                                  🔔 Called
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {canManage && ['confirmed', 'pending'].includes(app.status) && (
                                <button
                                  className="icon-button"
                                  style={{ width: 24, height: 24, color: '#1e5a3c' }}
                                  onClick={() => remindCustomer(app)}
                                  disabled={remindingId === app.id}
                                  title="Sila Na Po / Send Turn Reminder"
                                >
                                  <Bell size={13} />
                                </button>
                              )}
                              {canManage && (
                                <button
                                  className="icon-button"
                                  style={{ width: 24, height: 24 }}
                                  onClick={() => openEdit(app)}
                                  title="Edit schedule"
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px 10px', textAlign: 'center', color: '#8fa095', fontSize: '0.82rem' }}>
                        No appointments booked for this day.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showModal && (
        <Modal title="Add an appointment" subtitle="Create a booking for a reserved or walk-in customer." onClose={() => setShowModal(false)} wide>
          <form onSubmit={create} className="modal-form">
            <div className="form-grid two">
              <Field
                label="Customer"
                type="select"
                required
                value={form.customer_id}
                onChange={(v) => update('customer_id', v)}
                options={customers.map((c) => ({ value: String(c.id), label: `${c.full_name} · ${c.phone || 'No phone'}` }))}
                placeholder="Choose customer"
              />
              <Field
                label="Service"
                type="select"
                required
                value={form.service_id}
                onChange={(v) => update('service_id', v)}
                options={services.map((s) => ({ value: String(s.id), label: `${s.name} · ${money(s.price)}` }))}
                placeholder="Choose service"
              />
              <Field label="Appointment date" type="date" required min={todayString()} value={form.appointment_date} onChange={(v) => update('appointment_date', v)} />
              <Field label="Start time" type="time" required value={form.start_time} onChange={(v) => update('start_time', v)} />
              <Field label="Assign therapist" type="select" value={form.therapist_id} onChange={(v) => update('therapist_id', v)} options={therapists.map((t) => ({ value: String(t.id), label: t.name }))} placeholder="Assign later" />
              <Field label="Booking type" type="select" value={form.source} onChange={(v) => update('source', v)} options={[{ value: 'staff', label: 'Reserved / staff entry' }, { value: 'walk-in', label: 'Walk-in' }]} />
            </div>
            <Field label="Notes (optional)" type="textarea" value={form.notes} onChange={(v) => update('notes', v)} placeholder="Add appointment notes" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Create appointment'} <ArrowRight size={16} /></button>
            </div>
          </form>
        </Modal>
      )}

      {editingAppointment && (
        <Modal title="Edit appointment & schedule" subtitle={`Reschedule or update booking for ${editingAppointment.customer_name}`} onClose={() => setEditingAppointment(null)} wide>
          <form onSubmit={saveEdit} className="modal-form">
            <div className="form-grid two">
              <Field
                label="Service"
                type="select"
                required
                value={editForm.service_id}
                onChange={(v) => setEditForm({ ...editForm, service_id: v })}
                options={services.map((s) => ({ value: String(s.id), label: `${s.name} · ${money(s.price)}` }))}
              />
              <Field
                label="Assign therapist"
                type="select"
                value={editForm.therapist_id}
                onChange={(v) => setEditForm({ ...editForm, therapist_id: v })}
                options={therapists.map((t) => ({ value: String(t.id), label: t.name }))}
                placeholder="Unassigned"
              />
              <Field label="Appointment date" type="date" required value={editForm.appointment_date} onChange={(v) => setEditForm({ ...editForm, appointment_date: v })} />
              <Field label="Start time" type="time" required value={editForm.start_time} onChange={(v) => setEditForm({ ...editForm, start_time: v })} />
              <Field
                label="Status"
                type="select"
                required
                value={editForm.status}
                onChange={(v) => setEditForm({ ...editForm, status: v })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
              />
            </div>
            <Field label="Notes (optional)" type="textarea" value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} placeholder="Update appointment notes" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditingAppointment(null)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
