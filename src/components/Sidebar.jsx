import React from 'react';
import { X, Leaf, LockKeyhole, LogOut } from 'lucide-react';
import { NAV_ITEMS, ROLE_LABELS } from './Common';

export function Sidebar({ user, page, setPage, logout, mobileNav, setMobileNav, onChangePassword }) {
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  return (
    <>
      {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-with-logo">
          <div className="sidebar-logo-card">
            <img src="/wj-logo.png" alt="WJ Wellness Spa" className="brand-logo brand-logo-sidebar" />
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)}><X size={20} /></button>
        </div>
        <div className="branch-chip"><span className="branch-dot" /> SJDM BULACAN BRANCH</div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-link ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={19} strokeWidth={2} />
                <span>{item.label}</span>
                {page === item.id && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon"><Leaf size={20} /></div>
            <div><strong>Wellness in order.</strong><span>San Jose del Monte Branch</span></div>
          </div>
          <div className="profile-card">
            <div className="avatar">{user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="profile-meta">
              <strong>{user.full_name}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
            <button className="icon-button logout-button" onClick={onChangePassword} title="Change password">
              <LockKeyhole size={18} />
            </button>
            <button className="icon-button logout-button" onClick={logout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
