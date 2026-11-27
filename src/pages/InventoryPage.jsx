import React, { useState } from 'react';
import { Package, AlertTriangle, Boxes, Search, History, ArrowDownRight, ArrowUpRight, Pencil, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';
import { PageHeading, StatCard, EmptyState, LoadingLine, InlineError, Modal, Field, useApiData } from '../components/Common';
import { api, titleCase } from '../api';

export function InventoryPage({ user, refreshKey, onChanged, notify }) {
  const { data, loading, error } = useApiData('/api/inventory', refreshKey);
  const [showItem, setShowItem] = useState(false);
  const [showMovement, setShowMovement] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', category: 'General', sku: '', unit: 'pcs', quantity: '0', minimum_quantity: '5' });
  const [movement, setMovement] = useState({ movement_type: 'stock-in', quantity: '1', note: '' });
  const [historyItem, setHistoryItem] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const items = (data?.items || []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'low' ? item.quantity <= item.minimum_quantity : item.quantity > item.minimum_quantity))
  );

  const managers = ['owner', 'admin'].includes(user.role);

  const openItem = (item = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, category: item.category || 'General', sku: item.sku || '', unit: item.unit, quantity: String(item.quantity), minimum_quantity: String(item.minimum_quantity) } : { name: '', category: 'General', sku: '', unit: 'pcs', quantity: '0', minimum_quantity: '5' });
    setShowItem(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(editing ? `/api/inventory/${editing.id}` : '/api/inventory', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), minimum_quantity: Number(form.minimum_quantity) })
      });
      notify(editing ? 'Inventory item updated.' : 'Inventory item added.');
      setShowItem(false);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveMovement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/inventory/${showMovement.id}/movements`, {
        method: 'POST',
        body: JSON.stringify({ ...movement, quantity: Number(movement.quantity) })
      });
      notify('Stock movement recorded.');
      setShowMovement(null);
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (item) => {
    setHistoryItem(item);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      const result = await api(`/api/inventory/${item.id}/movements`);
      setHistoryRows(result.movements || []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Inventory control"
        description="Track product and supply quantities, stock movements, and items that need replenishment."
        action={managers ? () => openItem() : null}
        actionLabel="Add inventory item"
        actionIcon={Plus}
      />
      <div className="stats-grid compact-stats">
        <StatCard label="Active items" value={loading ? '—' : data?.items?.length ?? 0} detail="Products and supplies" icon={Package} tone="green" />
        <StatCard label="Low-stock alerts" value={loading ? '—' : (data?.items || []).filter((i) => i.quantity <= i.minimum_quantity).length} detail="At or below minimum" icon={AlertTriangle} tone="rose" />
        <StatCard label="Total units" value={loading ? '—' : (data?.items || []).reduce((sum, i) => sum + Number(i.quantity), 0).toLocaleString()} detail="Across active items" icon={Boxes} tone="blue" />
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="filter-tabs">
            <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All items</button>
            <button className={filter === 'low' ? 'selected' : ''} onClick={() => setFilter('low')}>Low stock</button>
            <button className={filter === 'healthy' ? 'selected' : ''} onClick={() => setFilter('healthy')}>In stock</button>
          </div>
          <div className="toolbar-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory" />
          </div>
        </div>
        {error && <InlineError message={error} />}
        {loading ? (
          <LoadingLine />
        ) : items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>CATEGORY</th>
                  <th>AVAILABLE</th>
                  <th>MINIMUM</th>
                  <th>STOCK STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-primary">{item.name}</div>
                      <div className="cell-muted">{item.sku || 'No SKU'} · {item.unit}</div>
                    </td>
                    <td>{item.category}</td>
                    <td><strong className="stock-number">{Number(item.quantity).toLocaleString()} <small>{item.unit}</small></strong></td>
                    <td>{Number(item.minimum_quantity).toLocaleString()} {item.unit}</td>
                    <td>
                      {item.quantity <= item.minimum_quantity ? (
                        <span className="low-stock-pill"><AlertTriangle size={13} /> Low stock</span>
                      ) : (
                        <span className="in-stock-pill"><CheckCircle2 size={13} /> In stock</span>
                      )}
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="mini-action" onClick={() => openHistory(item)} title="View stock history">
                          <History size={15} />
                        </button>
                        {managers && (
                          <>
                            <button
                              className="mini-action confirm"
                              onClick={() => { setMovement({ movement_type: 'stock-in', quantity: '1', note: '' }); setShowMovement(item); }}
                              title="Stock in"
                            >
                              <ArrowDownRight size={15} />
                            </button>
                            <button
                              className="mini-action danger"
                              onClick={() => { setMovement({ movement_type: 'stock-out', quantity: '1', note: '' }); setShowMovement(item); }}
                              title="Stock out"
                            >
                              <ArrowUpRight size={15} />
                            </button>
                            <button className="mini-action" onClick={() => openItem(item)} title="Edit item">
                              <Pencil size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Package} title="No inventory items found" description="Add products and supplies to begin monitoring branch stock." />
        )}
      </section>
      <div className="inventory-footnote">
        <ShieldCheck size={16} /> Stock-out entries cannot exceed the available quantity. Every stock movement is recorded with its user and timestamp.
      </div>

      {showItem && (
        <Modal title={editing ? 'Edit inventory item' : 'Add inventory item'} subtitle="Set the item details and minimum quantity for low-stock alerts." onClose={() => setShowItem(false)}>
          <form onSubmit={saveItem} className="modal-form">
            <Field label="Item name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Massage oil" />
            <div className="form-grid two">
              <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="e.g. Supplies" />
              <Field label="SKU / code" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="Optional" />
              <Field label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="pcs, bottles, packs" />
              <Field label="Minimum quantity" type="number" value={form.minimum_quantity} onChange={(v) => setForm({ ...form, minimum_quantity: v })} />
            </div>
            {!editing && (
              <Field label="Opening quantity" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} hint="Initial quantity will be logged as stock-in." />
            )}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowItem(false)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add item'}</button>
            </div>
          </form>
        </Modal>
      )}

      {historyItem && (
        <Modal title={`Stock movement history · ${historyItem.name}`} subtitle="Recorded stock-in and stock-out activity for this item." onClose={() => setHistoryItem(null)} wide>
          {historyLoading ? (
            <LoadingLine />
          ) : historyRows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>MOVEMENT</th>
                    <th>QUANTITY</th>
                    <th>NOTE</th>
                    <th>RECORDED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.created_at).toLocaleString('en-PH')}</td>
                      <td>
                        <span className={row.movement_type === 'stock-in' ? 'in-stock-pill' : 'low-stock-pill'}>
                          {titleCase(row.movement_type)}
                        </span>
                      </td>
                      <td>{row.quantity} {historyItem.unit}</td>
                      <td>{row.note || '—'}</td>
                      <td>{row.user_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={History} title="No stock movements yet" description="Stock activity will be listed here after the first stock-in or stock-out entry." />
          )}
        </Modal>
      )}

      {showMovement && (
        <Modal title={movement.movement_type === 'stock-in' ? 'Record stock-in' : 'Record stock-out'} subtitle={`${showMovement.name} · Available: ${showMovement.quantity} ${showMovement.unit}`} onClose={() => setShowMovement(null)}>
          <form onSubmit={saveMovement} className="modal-form">
            <Field label="Movement type" type="select" value={movement.movement_type} onChange={(v) => setMovement({ ...movement, movement_type: v })} options={[{ value: 'stock-in', label: 'Stock-in · Add quantity' }, { value: 'stock-out', label: 'Stock-out · Deduct quantity' }]} />
            <Field label={`Quantity (${showMovement.unit})`} type="number" required value={movement.quantity} onChange={(v) => setMovement({ ...movement, quantity: v })} />
            <Field label="Note / reason" value={movement.note} onChange={(v) => setMovement({ ...movement, note: v })} placeholder="e.g. Weekly supply replenishment" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowMovement(null)}>Cancel</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Record movement'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
