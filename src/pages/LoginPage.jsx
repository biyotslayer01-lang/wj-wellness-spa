import React, { useState, useEffect, useRef } from 'react';
import { Leaf, Mail, LockKeyhole, Eye, EyeOff, CircleAlert, ArrowRight, ShieldCheck, RotateCw } from 'lucide-react';
import { ThemeToggle } from '../context/ThemeContext';

function generateRandomCode(length = 5) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function LoginPage({ onLogin, notify }) {
  const [email, setEmail] = useState('owner@wjwellness.com');
  const [password, setPassword] = useState('Owner@123');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState(() => generateRandomCode(5));
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  const refreshCaptcha = () => {
    setCaptchaCode(generateRandomCode(5));
    setCaptchaInput('');
    setError('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#edf5ef');
    grad.addColorStop(1, '#dfeee2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative noise lines
    const lineColors = ['#b8d8be', '#9fc7a7', '#d0b986'];
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * 40);
      ctx.bezierCurveTo(
        canvas.width * 0.3, Math.random() * 40,
        canvas.width * 0.7, Math.random() * 40,
        canvas.width, Math.random() * 40
      );
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = '#7a9f84';
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Characters with slight rotation
    const charColors = ['#14382e', '#1c5037', '#7a5a22', '#1a4933', '#0e2b1f'];
    const startX = 16;
    const charSpacing = (canvas.width - 32) / captchaCode.length;
    ctx.font = 'bold 23px monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      const x = startX + i * charSpacing;
      const y = canvas.height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() * 24 - 12) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = charColors[i % charColors.length];
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [captchaCode]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    // Verify CAPTCHA
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError('Security code does not match. Please enter the new code shown.');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
      notify(err.message, 'error');
      refreshCaptcha();
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

            {/* SECURITY VERIFICATION CAPTCHA */}
            <div style={{ marginTop: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="field-label" style={{ margin: 0, fontSize: '0.88rem' }}>
                  Security Verification (CAPTCHA)
                </label>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  title="Generate new security code"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#286a48',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                >
                  <RotateCw size={13} />
                  <span>New code</span>
                </button>
              </div>

              <div className="captcha-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                <div style={{
                  background: '#f1f8f3',
                  border: '1px solid #c9dece',
                  borderRadius: '10px',
                  padding: '3px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}>
                  <canvas
                    ref={canvasRef}
                    width={130}
                    height={40}
                    style={{ borderRadius: '6px', display: 'block' }}
                  />
                </div>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  required
                  maxLength={5}
                  autoComplete="off"
                  style={{
                    height: '48px',
                    border: '1px solid #d4ded7',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    minWidth: 0,
                    flex: 1,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
            <button className="primary-button login-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to workspace'} <ArrowRight size={19} />
            </button>
          </form>
          <div className="login-legal">Authorized personnel only · Activity may be recorded for security.</div>
        </div>
      </div>
    </div>
  );
}
