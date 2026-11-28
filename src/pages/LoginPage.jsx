import React, { useState } from 'react';
import { Leaf, Mail, LockKeyhole, Eye, EyeOff, CircleAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../context/ThemeContext';

export function LoginPage({ onLogin, notify }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      const msg = err.message || 'Incorrect email or password. Please try again.';
      setError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Floating Theme Toggle on Login Page */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <ThemeToggle />
      </div>
      <div className="login-visual">
        {/* Subtle Ambient Glow Background Orbits */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(197,160,89,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(42,111,83,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* SINGLE CENTERED HERO LOGO CARD - CIRCULAR WHITE BADGE */}
        <div style={{
          width: '190px',
          height: '190px',
          background: 'radial-gradient(circle, #ffffff 60%, #fdf8f4 100%)',
          borderRadius: '50%',
          padding: '12px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 45px rgba(212, 175, 55, 0.35)',
          border: '4px solid #d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
          position: 'relative',
          zIndex: 2,
          transition: 'transform 0.3s ease'
        }}>
          <img
            src="/wj-logo.png"
            alt="WJ Wellness Spa - Brgy. Gaya-gaya, SJDM Bulacan"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>

        {/* ELEGANT TYPOGRAPHY & LINING */}
        <div style={{ maxWidth: '420px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '18px'
          }}>
            <span style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg, transparent, #d4af37)' }} />
            <span style={{ color: '#d4af37', fontSize: '13px' }}>✦</span>
            <span style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg, #d4af37, transparent)' }} />
          </div>

          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
            color: '#fffbf7',
            margin: '0 0 14px',
            fontFamily: "'Playfair Display', Georgia, serif"
          }}>
            “A serene space for care.<br /><span style={{ color: '#f5d688', fontStyle: 'italic' }}>A clear space to manage.</span>”
          </h2>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            marginBottom: '24px'
          }}>
            <span style={{
              fontSize: '0.78rem',
              letterSpacing: '0.22em',
              fontWeight: 800,
              color: '#fce4e8',
              textTransform: 'uppercase'
            }}>
              WJ WELLNESS SPA MANAGEMENT
            </span>
          </div>

          {/* DELICATE DIVIDER LINE */}
          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent)', margin: '0 auto 18px' }} />

          <div style={{ fontSize: '0.82rem', letterSpacing: '0.12em', color: '#e8c9cf', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.8 }}>
            <div>📍 2nd Floor JJMB Building, Brgy. Gaya-gaya, SJDM Bulacan</div>
            <div style={{
              color: '#ffd54f',
              fontWeight: 800,
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(212, 175, 55, 0.25)',
              letterSpacing: '0.14em'
            }}>
              📞 CONTACT US NOW: 0935-8548-741
            </div>
          </div>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="mobile-login-brand">
            <div className="mobile-logo-card">
              <img src="/wj-logo.png" alt="WJ Wellness Spa" className="brand-logo brand-logo-mobile" />
            </div>
          </div>

          {/* PROMINENT CUSTOMER APPOINTMENT BOOKING BANNER */}
          <div className="client-callout-card" style={{
            background: 'linear-gradient(135deg, #fffcfb 0%, #fdf2f3 100%)',
            border: '1.5px solid #ebd0d5',
            borderRadius: '16px',
            padding: '18px 22px',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(100, 16, 28, 0.06)'
          }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#911f31', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <span style={{ color: '#d4af37' }}>✦</span> ONLINE RESERVATION
              </span>
              <strong style={{ fontSize: '1.08rem', color: '#3b0b14', display: 'block', marginTop: '3px', fontFamily: "'Playfair Display', Georgia, serif" }}>
                Looking to Book an Appointment?
              </strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.86rem', color: '#7a5a61' }}>
                Explore our full massage rituals and reserve online in seconds.
              </p>
            </div>
            <a
              href="#book"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#book';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #881c2d 0%, #5e0d19 100%)',
                color: '#ffffff',
                padding: '11px 20px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(111, 22, 36, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              Book Online <ArrowRight size={17} />
            </a>
          </div>

          <div className="login-kicker"><span className="kicker-line" /> STAFF PORTAL</div>
          <h1>Welcome <em>back.</em></h1>
          <p className="login-subtitle">Sign in to manage your branch operations.</p>
          <form className="login-form" onSubmit={submit}>
            <label className="field-label">Email address</label>
            <div className="input-icon-wrap">
              <Mail size={19} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@wjwellness.com" required autoComplete="username" />
            </div>
            <label className="field-label">Password</label>
            <div className="input-icon-wrap">
              <LockKeyhole size={19} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && (
              <div className="login-error-alert" style={{ marginTop: '14px' }}>
                <CircleAlert size={20} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            <button className="primary-button login-submit" type="submit" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Signing in...' : 'Sign in to workspace'} <ArrowRight size={19} />
            </button>
          </form>
          <div className="login-legal">Authorized personnel only · Activity may be recorded for security.</div>
        </div>
      </div>
    </div>
  );
}
