import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, ClipboardList,
  LayoutDashboard, CalendarDays, Users, Stethoscope, Sparkles, Boxes, Wallet,
  FileBarChart2, UserCog, Plus, X
} from 'lucide-react';
import { api, titleCase } from '../api';

export const ROLE_LABELS = {
  owner: 'Business Owner',
  admin: 'Administrator',
  receptionist: 'Receptionist',
  therapist: 'Massage Therapist'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin', 'receptionist', 'therapist'] },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, roles: ['owner', 'admin', 'receptionist', 'therapist'] },
  { id: 'customers', label: 'Customers', icon: Users, roles: ['owner', 'admin', 'receptionist'] },
  { id: 'therapists', label: 'Therapists', icon: Stethoscope, roles: ['owner', 'admin', 'receptionist'] },
  { id: 'services', label: 'Services & prices', icon: Sparkles, roles: ['owner', 'admin'] },
  { id: 'transactions', label: 'Transactions', icon: Wallet, roles: ['owner', 'admin', 'receptionist'] },
  { id: 'reports', label: 'Sales reports', icon: FileBarChart2, roles: ['owner', 'admin'] },
  { id: 'users', label: 'User accounts', icon: UserCog, roles: ['owner', 'admin'] }
];

export const PAGE_TITLES = {
  dashboard: ['Good day', 'Here is what is happening at your branch today.'],
  appointments: ['Appointments', 'Manage reservations, walk-ins, and therapist schedules.'],
  customers: ['Customer directory', 'Keep customer details organized and easy to retrieve.'],
  therapists: ['Therapist management', 'Manage therapist profiles, attendance (ABSENT/PRESENT), and workloads.'],
  services: ['Services & pricing', 'Maintain the services offered by your branch.'],
  transactions: ['Transactions', 'Record customer payments and review transaction history.'],
  reports: ['Sales reports', 'Review recorded sales, therapist commissions (30%), and spa revenue (70%).'],
  users: ['User accounts', 'Control access based on each team member’s responsibilities.']
};

export function getPageFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return NAV_ITEMS.some((item) => item.id === hash) ? hash : 'dashboard';
}

export function useApiData(path, refreshKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(path)
      .then((result) => { if (active) { setData(result); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, refreshKey]);
  return { data, loading, error };
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  options = [],
  min,
  maxLength,
  disabled = false,
  hint = ''
}) {
  const isPhone = type === 'tel' || /mobile|phone|contact/i.test(label);

  const handleInputChange = (e) => {
    let val = e.target.value;
    if (isPhone) {
      // Strictly allow only numbers (digits 0-9), max 11 numbers (e.g. 09XXXXXXXXX)
      val = val.replace(/\D/g, '').slice(0, 11);
    }
    onChange(val);
  };

  return (
    <label className="field-wrap">
      <span className="field-label">{label}{required && <i> *</i>}</span>
      {type === 'select' ? (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}>
          <option value="">{placeholder || 'Select an option'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} disabled={disabled} />
      ) : (
        <input
          type={isPhone ? 'tel' : type}
          value={value ?? ''}
          onChange={handleInputChange}
          placeholder={isPhone && !placeholder ? '09XXXXXXXXX' : placeholder}
          required={required}
          min={min}
          maxLength={isPhone ? 11 : maxLength}
          inputMode={isPhone ? 'numeric' : undefined}
          pattern={isPhone ? '[0-9]{11}' : undefined}
          disabled={disabled}
        />
      )}
      {hint ? (
        <small className="field-hint">{hint}</small>
      ) : isPhone && value && value.length > 0 && value.length < 11 ? (
        <small className="field-hint" style={{ color: '#b95138' }}>
          {11 - value.length} more digit{11 - value.length > 1 ? 's' : ''} needed (11 numbers required)
        </small>
      ) : null}
    </label>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-card ${wide ? 'modal-wide' : ''}`}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  return (
    <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
      <span className="toast-icon">{toast.type === 'error' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span>
      <span>{toast.message}</span>
      <button onClick={onClose}><X size={15} /></button>
    </div>
  );
}

export function PageHeading({
  kicker = 'BRANCH OPERATIONS',
  title,
  description,
  action,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  secondaryAction,
  secondaryActionLabel,
  secondaryActionIcon: SecondaryActionIcon = Plus
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {secondaryAction && (
          <button
            type="button"
            className="secondary-button heading-action"
            onClick={secondaryAction}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <SecondaryActionIcon size={17} /> {secondaryActionLabel}
          </button>
        )}
        {action && (
          <button className="primary-button heading-action" onClick={action}>
            <ActionIcon size={17} /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'green', trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{trend && <span className="stat-trend"><ArrowUpRight size={13} /></span>}{detail}</div>
    </div>
  );
}

export function StatusPill({ status }) {
  const text = titleCase(status || 'pending');
  return <span className={`status-pill status-${String(status || 'pending').toLowerCase()}`}><i />{text}</span>;
}

export function EmptyState({ icon: Icon = ClipboardList, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={23} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function LoadingLine() {
  return <div className="loading-line"><span /><span /><span /></div>;
}

export function InlineError({ message }) {
  return <div className="inline-error"><AlertTriangle size={16} />{message}</div>;
}

export function ReceiptIcon() {
  return <ClipboardList size={19} />;
}

export function MapPinIcon() {
  return <span className="map-pin-icon">⌖</span>;
}
