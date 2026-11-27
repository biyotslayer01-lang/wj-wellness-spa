import React, { useState, useEffect } from 'react';
import { Menu, CalendarDays, LogOut } from 'lucide-react';
import { PAGE_TITLES } from './Common';
import { ThemeToggle } from '../context/ThemeContext';

export function Topbar({ user, page, setMobileNav, logout }) {
  const [dateText, setDateText] = useState('');
  useEffect(() => {
    setDateText(new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);
  const [title] = PAGE_TITLES[page] || PAGE_TITLES.dashboard;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
        <div>
          <div className="eyebrow">WJ WELLNESS SPA <span>/</span> {page.replace('-', ' ').toUpperCase()}</div>
          <div className="topbar-title">
            {title === 'Good day' ? `${title}, ${user.full_name.split(' ')[0]}` : title}
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <ThemeToggle />
        <div className="today-label"><CalendarDays size={15} /> {dateText}</div>
        <div className="topbar-avatar" title={user.full_name}>{user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
        {logout && (
          <button
            className="icon-button topbar-logout-btn"
            onClick={logout}
            title="Sign out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fbf3f0',
              color: '#933e2c',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid #f0d5cc',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
