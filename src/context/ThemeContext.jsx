import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('wj_spa_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('wj_spa_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        background: isDark ? 'rgba(255, 215, 0, 0.12)' : 'rgba(84, 17, 29, 0.07)',
        color: isDark ? '#ffd700' : '#6b1422',
        border: isDark ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(84, 17, 29, 0.15)',
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '0.82rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        backdropFilter: 'blur(8px)',
        boxShadow: isDark ? '0 2px 10px rgba(255, 215, 0, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
        ...style
      }}
    >
      {isDark ? (
        <>
          <Sun size={15} style={{ color: '#ffd700' }} />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={15} style={{ color: '#6b1422' }} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
