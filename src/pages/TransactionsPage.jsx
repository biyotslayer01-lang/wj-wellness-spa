import React, { useState } from 'react';
import { CreditCard, Wallet, Banknote, Clock3, Search, LockKeyhole } from 'lucide-react';
import { PageHeading, StatCard, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api, dateLabel, money } from '../api';

export function TransactionsPage({ refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/transactions', refreshKey);
  const { data: unpaidData } = useApiData('/api/appointments?unpaid=1', refreshKey);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    appointment_id: '',
    amount: '',
    method: 'Cash',
    reference: '',
    discount_type: 'None',
    discount_amount: 0
  });
  const [saving, setSaving] = useState(false);
  const [searchTransactions, setSearchTransactions] = useState('');

  const allTransactions = data?.transactions || [];
  const transactions = allTransactions.filter((t) =>
    `${t.customer_name} ${t.service_name} ${t.method} ${t.reference || ''}`.toLowerCase().includes(searchTransactions.toLowerCase())
  );
  const unpaid = (unpaidData?.appointments || []).filter((a) => a.status !== 'cancelled');
  const selected = unpaid.find((a) => String(a.id) === String(form.appointment_id));

  const open = () => {
    setForm({
      appointment_id: '',
      amount: '',
      method: 'Cash',
      reference: '',
      discount_type: 'None',
      discount_amount: 0
    });
    setShowModal(true);
  };

  const updateForm = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  const applyDiscountPreset = (type, percent) => {
    if (!selected) return;
    const basePrice = Number(selected.service_price || 0);
    const disc = (basePrice * percent) / 100;
    const finalAmt = Math.max(0, basePrice - disc);
    setForm((old) => ({
      ...old,
      discount_type: type,
      discount_amount: disc,
      amount: String(finalAmt)
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: Number(form.appointment_id),
          method: form.method,
          reference: form.reference,
          amount: form.amount === '' ? undefined : Number(form.amount),
          discount_type: form.discount_type,
          discount_amount: Number(form.discount_amount || 0)
        })
      });
      notify('Payment recorded successfully.');
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
        title="Payment & transactions"
        description="Record payments received at the branch, apply Senior/PWD/Promo discounts, and track revenue."
        action={() => open()}
        actionLabel="Record payment"
        actionIcon={CreditCard}
      />
      <div className="stats-grid compact-stats">
        <StatCard label="Recorded transactions" value={loading ? '—' : allTransactions.length} detail="Stored payment records" icon={Wallet} tone="green" />
        <StatCard label="Total recorded sales" value={loading ? '—' : money(allTransactions.reduce((sum, t) => sum + Number(t.amount), 0))} detail="All recorded payments" icon={Banknote} tone="blue" />
        <StatCard label="Awaiting payment" value={unpaid.length} detail="Appointments without payment" icon={Clock3} tone="gold" />
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3 className="table-title">Transaction history</h3>
            <span className="table-subtitle">Most recent payment records</span>
          </div>
          <div className="toolbar-search">
            <Search size={16} />
            <input placeholder="Search transactions" onChange={(e) => setSearchTransactions(e.target.value)} />
          </div>
        </div>
        {error && <InlineError message={error} />}
        {loading ? (
          <LoadingLine />
        ) : transactions.length ? (
          <TransactionTable transactions={transactions} />
        ) : (
          <EmptyState icon={Wallet} title="No payments recorded" description="Payments entered by authorized personnel will appear here." />
        )}
      </section>
      <div className="payment-disclaimer">
        <LockKeyhole size={15} /> This system records payments made through the branch's accepted methods. It does not process online transfers.
      </div>

      {showModal && (
        <Modal title="Record customer payment" subtitle="Select the completed service and apply applicable discounts." onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="modal-form">
            <Field
              label="Appointment"
              type="select"
              required
              value={form.appointment_id}
              onChange={(v) => {
                const match = unpaid.find((a) => String(a.id) === v);
                updateForm('appointment_id', v);
                updateForm('amount', match ? String(match.service_price) : '');
                updateForm('discount_type', 'None');
                updateForm('discount_amount', 0);
              }}
              options={unpaid.map((a) => ({
                value: String(a.id),
                label: `${a.customer_name} · ${a.service_name} · ${dateLabel(a.appointment_date)} ${a.start_time}`
              }))}
              placeholder="Choose unpaid appointment"
            />

            {selected && (
              <>
                <div className="payment-amount-preview">
                  <span>Regular Service Price</span>
                  <strong>{money(selected.service_price)}</strong>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <span className="field-label" style={{ display: 'block', marginBottom: '4px' }}>Discount / Special Promo</span>
                  <div className="discount-pills">
                    <button
                      type="button"
                      className={`discount-pill ${form.discount_type === 'None' ? 'selected' : ''}`}
                      onClick={() => applyDiscountPreset('None', 0)}
                    >
                      No Discount (0%)
                    </button>
                    <button
                      type="button"
                      className={`discount-pill ${form.discount_type === 'Senior/PWD' ? 'selected' : ''}`}
                      onClick={() => applyDiscountPreset('Senior/PWD', 20)}
                    >
                      Senior / PWD (20%)
                    </button>
                    <button
                      type="button"
                      className={`discount-pill ${form.discount_type === 'Promo' ? 'selected' : ''}`}
                      onClick={() => applyDiscountPreset('Promo', 10)}
                    >
                      Special Promo (10%)
                    </button>
                  </div>
                </div>

                {form.discount_type !== 'None' && form.discount_amount > 0 && (
                  <div className="discount-applied-line">
                    <span>Discount Applied ({form.discount_type}):</span>
                    <strong>-{money(form.discount_amount)}</strong>
                  </div>
                )}
              </>
            )}

            <Field label="Total amount received (PHP)" type="number" required value={form.amount} onChange={(v) => updateForm('amount', v)} />
            <Field
              label="Payment method"
              type="select"
              value={form.method}
              onChange={(v) => updateForm('method', v)}
              options={['Cash', 'GCash', 'Maya', 'Card', 'Other'].map((v) => ({ value: v, label: v }))}
            />
            <Field label="Reference / notes (optional)" value={form.reference} onChange={(v) => updateForm('reference', v)} placeholder="Reference number or note" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-button" disabled={saving || !unpaid.length}>
                {saving ? 'Saving...' : 'Record payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function TransactionTable({ transactions }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>CUSTOMER</th>
            <th>SERVICE</th>
            <th>PAYMENT METHOD</th>
            <th>AMOUNT</th>
            <th>RECEIVED</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="cell-primary">TXN-{String(t.id).padStart(5, '0')}</div>
                <div className="cell-muted">{t.reference || 'No reference'}</div>
              </td>
              <td><span className="cell-primary">{t.customer_name}</span></td>
              <td>
                <div className="cell-primary">{t.service_name}</div>
                <div className="cell-muted">{dateLabel(t.appointment_date)} · {t.start_time}</div>
              </td>
              <td>
                <span className="payment-method">
                  <CreditCard size={14} />{t.method}
                  {t.discount_type && t.discount_type !== 'None' && (
                    <small style={{ display: 'block', color: '#1f6645', fontSize: '0.72rem' }}>
                      {t.discount_type}
                    </small>
                  )}
                </span>
              </td>
              <td><strong className="amount-cell">{money(t.amount)}</strong></td>
              <td>
                <div className="cell-primary">
                  {new Date(t.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="cell-muted">{t.received_by_name || 'Staff account'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
