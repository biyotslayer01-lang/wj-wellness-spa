import React, { useState } from 'react';
import { ArrowRight, Clock3, ShieldCheck, Check, AlertCircle, DoorOpen, User, Users } from 'lucide-react';
import { Field, MapPinIcon, useApiData } from '../components/Common';
import { api, money, todayString } from '../api';
import { ThemeToggle } from '../context/ThemeContext';

const SERVICE_IMAGES = {
  signature: '/samples/massage-signature.jpg',
  back: '/samples/massage-signature.jpg',
  premium: '/samples/massage-swedish.jpg',
  deluxe: '/samples/prod-compress.jpg',
  ventosa: '/samples/prod-compress.jpg',
  scrub: '/samples/prod-scrub.jpg',
  luxury: '/samples/prod-scrub.jpg',
  stone: '/samples/prod-stones.jpg',
  executive: '/samples/prod-stones.jpg',
  superior: '/samples/massage-signature.jpg',
  couples: '/samples/massage-swedish.jpg',
  deep: '/samples/massage-signature.jpg',
  tissue: '/samples/massage-signature.jpg',
  foot: '/samples/massage-footspa.jpg',
  reflex: '/samples/massage-footspa.jpg',
  ear: '/samples/prod-oil.jpg',
  candling: '/samples/prod-oil.jpg'
};

function getServiceImage(name = '') {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(SERVICE_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  return '/samples/massage-signature.jpg';
}

export function BookingPage({ notify }) {
  const { data: serviceData, loading: servicesLoading } = useApiData('/api/public/services', 0);
  const { data: therapistData } = useApiData('/api/public/therapists', 0);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    service_id: '',
    therapist_id: '',
    has_room: false,
    appointment_date: todayString(),
    start_time: '14:00',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  const services = serviceData?.services || [];
  const therapists = therapistData?.therapists || [];

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  const handleSelectServiceCard = (service) => {
    update('service_id', String(service.id));
    const formElem = document.getElementById('booking-form-card');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Price calculation
  const selectedService = services.find((s) => String(s.id) === String(form.service_id));
  const servicePrice = Number(selectedService?.price || 0);
  const roomPrice = form.has_room ? 100 : 0;
  const estimatedTotal = servicePrice + roomPrice;
  const estimatedDuration = selectedService?.duration_minutes || 60;

  // Check 2:00 PM to 3:00 AM operating hours
  const checkTimeValidity = (timeStr, duration = 60) => {
    if (!timeStr || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return { valid: false, reason: 'Please select a valid time.' };
    const [h, m] = timeStr.split(':').map(Number);
    const startMins = h < 6 ? (h + 24) * 60 + m : h * 60 + m;
    const endMins = startMins + duration;
    const openMins = 14 * 60; // 2:00 PM
    const closeMins = 27 * 60; // 3:00 AM next morning

    if (startMins < openMins) {
      return {
        valid: false,
        reason: 'We open at 2:00 PM. Please select a time between 2:00 PM and 3:00 AM.'
      };
    }
    if (endMins > closeMins) {
      return {
        valid: false,
        reason: `Our branch closes at 3:00 AM. For this ${duration}-minute session, please book at or before ${Math.floor((closeMins - duration) / 60) > 23 ? `${String(Math.floor((closeMins - duration) / 60) - 24).padStart(2, '0')}:${String((closeMins - duration) % 60).padStart(2, '0')} AM` : `${String(Math.floor((closeMins - duration) / 60)).padStart(2, '0')}:${String((closeMins - duration) % 60).padStart(2, '0')}`}.`
      };
    }
    return { valid: true };
  };

  const timeValidity = checkTimeValidity(form.start_time, estimatedDuration);

  const submit = async (e) => {
    e.preventDefault();
    if (!timeValidity.valid) {
      notify(timeValidity.reason, 'error');
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      notify('Please enter a valid 11-digit mobile number (e.g. 09XXXXXXXXX).', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/public/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...form, phone: cleanPhone, notes: form.notes })
      });
      setComplete(true);
      notify('Appointment request sent successfully!');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-page">
      {/* BRAND HEADER */}
      <header className="booking-header">
        <a href="/" className="booking-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#ffffff',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            padding: '4px',
            boxShadow: '0 4px 16px rgba(90,15,25,0.18), 0 0 0 2px rgba(197, 160, 89, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img
              src="/wj-logo.png"
              alt="WJ Wellness Spa"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <strong style={{ fontSize: '1.25rem', color: '#4a0d18', fontWeight: 900, letterSpacing: '0.02em', display: 'block', lineHeight: 1.2 }}>
              WJ Wellness Spa
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#881c2d', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Home / Hotel Service &amp; Branch
            </span>
          </div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <div className="branch-chip" style={{ margin: 0, background: '#fcedef', color: '#6d1421', borderColor: '#ebcad0' }}>
            <span className="branch-dot" /> BRGY. GAYA-GAYA, SJDM
          </div>
          <a
            className="booking-staff-link"
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '#dashboard';
            }}
          >
            Staff login <ArrowRight size={17} />
          </a>
        </div>
      </header>

      {/* SAMPLE SERVICES MENU */}
      <section style={{ maxWidth: '1220px', margin: '30px auto 10px', width: '100%', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <span className="section-kicker" style={{ fontSize: '0.9rem', color: 'var(--brand-secondary, #911f31)' }}>EXCLUSIVE MENU &amp; PACKAGES</span>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '6px 0 8px' }}>
            WJ Wellness Spa Services &amp; Packages
          </h2>
          <p style={{ color: 'var(--text-muted, #73575c)', fontSize: '1rem', maxWidth: '650px', margin: '0 auto' }}>
            Home &amp; Hotel Service (+200 Min Transpo Tungko-Muzon) &amp; Branch Service. Click any service card below to pre-fill your reservation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '45px' }}>
          {services.map((svc, idx) => {
            const isSelected = String(form.service_id) === String(svc.id);
            const serviceImg = getServiceImage(svc.name);
            return (
              <div
                key={svc.id}
                onClick={() => handleSelectServiceCard(svc)}
                className={`service-card-interactive ${isSelected ? 'selected' : ''}`}
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transform: isSelected ? 'translateY(-3px)' : 'none'
                }}
              >
                {/* SAMPLE PICTURE WITH LOGO STAMP & GRADIENT OVERLAY */}
                <div style={{ position: 'relative', height: '175px', width: '100%', overflow: 'hidden', background: '#3b0b13' }}>
                  <img
                    src={serviceImg}
                    alt={svc.name}
                    className="service-card-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(59, 11, 19, 0.88) 0%, rgba(59, 11, 19, 0.2) 55%, transparent 100%)'
                  }} />

                  {/* Official WJ Logo Stamp - Circular */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#ffffff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    padding: '2px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3), 0 0 0 2px rgba(197, 160, 89, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src="/wj-logo.png" alt="WJ Wellness Spa" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  </div>

                  {/* Duration Tag */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(74, 13, 24, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    padding: '4px 11px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: '1px solid rgba(255,255,255,0.22)'
                  }}>
                    <Clock3 size={13} />
                    {svc.duration_minutes} mins
                  </div>

                  {idx === 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, #c5a059 0%, #9e7a33 100%)',
                      color: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '5px 11px',
                      borderRadius: '8px',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                      BEST SELLER ★
                    </span>
                  )}
                </div>

                {/* CONTENT BODY */}
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="service-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                      {svc.name}
                    </h3>
                    <p className="service-desc" style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: 0 }}>
                      {svc.description || 'Full relaxation and therapeutic care tailored to your wellness.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color, #edf2ee)' }}>
                    <div>
                      <span className="rate-kicker" style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: '0.06em' }}>
                        Session Rate
                      </span>
                      <strong className="rate-value" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                        {Number(svc.price) > 0 ? money(svc.price) : 'Contact branch'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className={`service-card-btn ${isSelected ? 'selected' : ''}`}
                    >
                      {isSelected ? '✓ Selected' : 'Choose Service'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RESERVATION FORM LAYOUT */}
      <div className="booking-layout">
        <section className="booking-intro">
          <div className="login-kicker"><span className="kicker-line" /> YOUR TIME TO UNWIND</div>
          <h1>Make space<br />for <em>wellness.</em></h1>
          <p>Send us your preferred service and schedule. Our team will review therapist availability and contact you promptly to confirm your reservation.</p>
          <div className="booking-detail">
            <div className="booking-detail-item">
              <Clock3 size={20} />
              <div>
                <strong>Operating Hours</strong>
                <span>Open Daily: 2:00 PM – 3:00 AM (Home / Hotel &amp; Branch Service)</span>
              </div>
            </div>
            
            <div className="booking-detail-item">
              <MapPinIcon />
              <div>
                <strong>Branch Location</strong>
                <span>2nd Floor JJMB Building, National Road, Brgy Gaya-gaya, SJDM Bulacan</span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=14.7946,121.0528"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="booking-detail-link"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    marginTop: '6px',
                    fontSize: '0.88rem'
                  }}
                >
                  📍 Open in Google Maps (View Exact Pin) ↗
                </a>
              </div>
            </div>

            {/* SEPARATE DEDICATED ROW FOR CONTACT US NOW */}
            <div className="booking-detail-item contact-item">
              <Clock3 size={20} />
              <div>
                <strong>Contact Us Now:</strong>
                <a
                  href="tel:09358548741"
                  className="booking-phone-link"
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginTop: '2px'
                  }}
                >
                  📞 0935-8548-741
                </a>
                <small className="booking-transpo-note" style={{ display: 'block', marginTop: '3px', fontSize: '0.84rem' }}>
                  (+200 Min Transpo Tungko-Muzon for Home &amp; Hotel Service)
                </small>
              </div>
            </div>
          </div>

          {/* ACCURATE INTERACTIVE BRANCH FINDER & GOOGLE MAPS API CARD */}
          <div className="maps-container-card" style={{
            marginTop: '24px',
            borderRadius: '18px',
            border: '1.5px solid var(--border-color, #ebdcdb)',
            overflow: 'hidden',
            boxShadow: '0 8px 26px rgba(84, 17, 29, 0.09)',
            background: 'var(--card-bg, #ffffff)'
          }}>
            <div className="maps-header" style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--border-color, #ebdcdb)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--text-color, #2b1115)' }}>WJ Wellness Spa · Gaya-gaya Branch</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#7a5a60' }}>
                  2nd Floor JJMB Building, National Road, Brgy. Gaya-gaya, SJDM Bulacan
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=14.7946,121.0528&destination_place_id=&travelmode=driving"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #881c2d 0%, #570c19 100%)',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '9px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(87, 12, 25, 0.25)'
                  }}
                >
                  🚗 Navigate / Directions
                </a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=14.7946,121.0528"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'rgba(136, 28, 45, 0.08)',
                    color: '#881c2d',
                    border: '1px solid #ebdcdb',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  View in GMaps ↗
                </a>
              </div>
            </div>

            {/* LIVE ACCURATE EMBEDDED GMAPS IFRAME */}
            <div style={{ position: 'relative', width: '100%', height: '240px', background: '#f5ebea' }}>
              <iframe
                title="WJ Wellness Spa Google Maps Exact Location"
                src="https://maps.google.com/maps?q=14.7946,121.0528+(WJ%20Wellness%20Spa%20-%20JJMB%20Building,%20Gaya-gaya)&t=&z=16&ie=UTF8&iwloc=B&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                allowFullScreen
              />
            </div>

            {/* BRANCH FINDER QUICK NAVIGATION BADGES */}
            <div style={{ padding: '12px 16px', background: 'var(--card-bg-alt, #faf4f5)', borderTop: '1px solid var(--border-color, #ebdcdb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#68454b' }}>
                <span style={{ fontWeight: 800, color: '#881c2d' }}>Landmarks:</span>
                <span>Near Gaya-gaya Barangay Hall &amp; National Road</span>
              </div>
              <div style={{ color: '#881c2d', fontWeight: 700 }}>
                GPS: 14.7946° N, 121.0528° E
              </div>
            </div>
          </div>

          <div className="booking-note" style={{ marginTop: '20px' }}>
            <ShieldCheck size={20} /> Your request will be reviewed by WJ Wellness Spa staff to guarantee therapist availability before final confirmation.
          </div>
        </section>

        <section className="booking-card" id="booking-form-card">
          {complete ? (
            <div className="booking-success">
              <div className="success-icon"><Check size={38} /></div>
              <h2>Appointment Request Sent!</h2>
              <p>Thank you for choosing WJ Wellness Spa. Our reception team will call or SMS your mobile number to confirm your schedule and therapist.</p>
              <div style={{ margin: '20px 0', padding: '16px', background: '#fdf5f6', borderRadius: '12px', border: '1px solid #edd1d5', textAlign: 'left' }}>
                <strong style={{ display: 'block', color: '#4a0d18', marginBottom: '6px' }}>Reservation Summary:</strong>
                <div style={{ fontSize: '0.92rem', color: '#68454b', lineHeight: 1.6 }}>
                  <div>📅 Date: <strong>{form.appointment_date}</strong> at <strong>{form.start_time}</strong></div>
                  <div>💆 Service: <strong>{selectedService?.name || 'Selected Spa Service'}</strong></div>
                  {form.has_room && (
                    <div>🚪 Private Room: <strong>Availing Private Room (+₱100)</strong></div>
                  )}
                  {estimatedTotal > 0 && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #dfbec4', fontWeight: 800, color: '#881c2d' }}>
                      Estimated Total: {money(estimatedTotal)}
                    </div>
                  )}
                </div>
              </div>
              <a href="/" className="secondary-button" style={{ padding: '12px 26px', fontSize: '1rem', display: 'inline-block' }}>Back to home</a>
            </div>
          ) : (
            <>
              <div className="booking-card-head">
                <div>
                  <span className="section-kicker">ONLINE RESERVATION</span>
                  <h2>Request an appointment</h2>
                </div>
                <div className="booking-step">01 <span>/</span> 01</div>
              </div>

              <form onSubmit={submit} className="booking-form">
                <div className="form-section-title">YOUR CONTACT INFORMATION</div>
                <div className="form-grid two">
                  <Field label="Full name" required value={form.full_name} onChange={(v) => update('full_name', v)} placeholder="e.g. Romalyn Delos Santos" />
                  <Field label="Mobile number (11 digits)" required value={form.phone} onChange={(v) => update('phone', v)} placeholder="09XXXXXXXXX" />
                  <Field label="Email address" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="Optional (e.g. Roma@gmail.com)" />
                </div>

                <div className="form-section-title form-section-spaced">SERVICE & SCHEDULE</div>
                <Field
                  label="Select a service"
                  type="select"
                  required
                  value={form.service_id}
                  onChange={(v) => update('service_id', v)}
                  options={services.map((s) => ({ value: String(s.id), label: `${s.name} (${s.duration_minutes} mins) · ${Number(s.price) > 0 ? money(s.price) : 'Price to be confirmed'}` }))}
                  placeholder={servicesLoading ? 'Loading services...' : 'Choose a service'}
                />

                <div className="form-grid two">
                  <Field label="Preferred date" type="date" min={todayString()} required value={form.appointment_date} onChange={(v) => update('appointment_date', v)} />
                  <Field label="Preferred time" type="time" required value={form.start_time} onChange={(v) => update('start_time', v)} />
                </div>

                {/* ELEGANT LIVE OPERATING HOURS NOTICE */}
                {!timeValidity.valid ? (
                  <div className="hours-notice-banner invalid">
                    <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#c62828' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '2px', color: '#b71c1c' }}>
                        ⏰ Notice: Operating Hours (2:00 PM – 3:00 AM)
                      </strong>
                      <span>{timeValidity.reason}</span>
                    </div>
                  </div>
                ) : (
                  <div className="hours-valid-badge" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    marginBottom: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}>
                    <Clock3 size={14} style={{ color: 'var(--brand-accent, #c99846)' }} />
                    <span>Selected time is within our <strong>2:00 PM – 3:00 AM</strong> operating hours.</span>
                  </div>
                )}

                {/* ROOM OPTION ADD-ON (+100 PHP) */}
                <div style={{
                  margin: '16px 0',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: form.has_room ? '2px solid #881c2d' : '1px solid var(--border-color, #e0d5d5)',
                  background: form.has_room ? 'rgba(136, 28, 45, 0.05)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onClick={() => update('has_room', !form.has_room)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: form.has_room ? '#881c2d' : '#f0e6e7',
                      color: form.has_room ? '#ffffff' : '#881c2d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <DoorOpen size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-color, #2b1115)' }}>
                        Avail Private Room (+₱100)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#7a5a60' }}>
                        Exclusive private VIP room for maximum relaxation &amp; privacy
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.has_room}
                    onChange={(e) => update('has_room', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#881c2d' }}
                  />
                </div>

                {/* THERAPIST SELECTION: REDESIGNED WITH MALE & FEMALE POV / CARDS & ABSENT BADGE */}
                <div style={{ marginTop: '20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-color, #333)' }}>
                      Select Preferred Therapist (Optional)
                    </label>
                    {form.therapist_id && (
                      <button
                        type="button"
                        onClick={() => update('therapist_id', '')}
                        style={{ background: 'none', border: 'none', color: '#881c2d', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Reset preference
                      </button>
                    )}
                  </div>

                  {/* Female Therapists */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', color: '#a62438', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🌸 FEMALE THERAPISTS</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                      {therapists.filter((t) => t.gender === 'female' || !t.gender).map((t) => {
                        const isAbsent = Boolean(t.is_absent);
                        const isSelected = String(form.therapist_id) === String(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (isAbsent) {
                                notify(`${t.name} is currently ABSENT today and cannot be selected.`, 'error');
                                return;
                              }
                              update('therapist_id', isSelected ? '' : String(t.id));
                            }}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #881c2d' : '1px solid var(--border-color, #e4d7d7)',
                              background: isAbsent ? '#fbf4f4' : (isSelected ? 'rgba(136, 28, 45, 0.08)' : 'var(--card-bg, #ffffff)'),
                              cursor: isAbsent ? 'not-allowed' : 'pointer',
                              opacity: isAbsent ? 0.6 : 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(136, 28, 45, 0.18)' : 'none'
                            }}
                          >
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: isAbsent ? '#dcd1d1' : (isSelected ? '#881c2d' : '#f7ebee'),
                              color: isSelected ? '#ffffff' : '#881c2d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              marginBottom: '6px'
                            }}>
                              {t.name.charAt(0)}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAbsent ? '#888' : 'var(--text-color, #333)' }}>
                              {t.name}
                            </span>
                            {isAbsent ? (
                              <span style={{
                                marginTop: '4px',
                                background: '#e53935',
                                color: '#ffffff',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.04em'
                              }}>
                                ABSENT
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: isSelected ? '#881c2d' : '#8c7075', marginTop: '2px' }}>
                                {isSelected ? '✓ Selected' : 'Available'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Male Therapists */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', color: '#1b5e8c', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🌿 MALE THERAPISTS</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                      {therapists.filter((t) => t.gender === 'male').map((t) => {
                        const isAbsent = Boolean(t.is_absent);
                        const isSelected = String(form.therapist_id) === String(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (isAbsent) {
                                notify(`${t.name} is currently ABSENT today and cannot be selected.`, 'error');
                                return;
                              }
                              update('therapist_id', isSelected ? '' : String(t.id));
                            }}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #1b5e8c' : '1px solid var(--border-color, #d7e0e4)',
                              background: isAbsent ? '#f4f7f8' : (isSelected ? 'rgba(27, 94, 140, 0.08)' : 'var(--card-bg, #ffffff)'),
                              cursor: isAbsent ? 'not-allowed' : 'pointer',
                              opacity: isAbsent ? 0.6 : 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(27, 94, 140, 0.18)' : 'none'
                            }}
                          >
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: isAbsent ? '#d1d8dc' : (isSelected ? '#1b5e8c' : '#ebf2f7'),
                              color: isSelected ? '#ffffff' : '#1b5e8c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              marginBottom: '6px'
                            }}>
                              {t.name.charAt(0)}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAbsent ? '#888' : 'var(--text-color, #333)' }}>
                              {t.name}
                            </span>
                            {isAbsent ? (
                              <span style={{
                                marginTop: '4px',
                                background: '#e53935',
                                color: '#ffffff',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.04em'
                              }}>
                                ABSENT
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: isSelected ? '#1b5e8c' : '#6b7f8c', marginTop: '2px' }}>
                                {isSelected ? '✓ Selected' : 'Available'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Field label="Special requests or medical notes (optional)" type="textarea" value={form.notes} onChange={(v) => update('notes', v)} placeholder="e.g. Focus on lower back, prefer gentle pressure, Home/Hotel address, etc." />

                {/* ESTIMATED LIVE TOTAL SUMMARY */}
                {selectedService && (
                  <div className="booking-summary-box" style={{ borderRadius: '12px', padding: '14px 18px', margin: '14px 0 6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="summary-title" style={{ fontSize: '0.96rem', fontWeight: 600 }}>
                        {selectedService.name} ({estimatedDuration} mins)
                      </span>
                      <strong className="summary-price" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        {money(servicePrice)}
                      </strong>
                    </div>
                    {form.has_room && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.88rem', color: '#881c2d', fontWeight: 600 }}>
                        <span>Private Room Add-on</span>
                        <span>+₱100.00</span>
                      </div>
                    )}
                    {form.has_room && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #ebdcdb', fontSize: '1.05rem', fontWeight: 800 }}>
                        <span>Total Estimated</span>
                        <span style={{ color: '#881c2d' }}>{money(estimatedTotal)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="primary-button booking-submit" disabled={submitting || servicesLoading}>
                  {submitting ? 'Sending request...' : 'Submit appointment request'} <ArrowRight size={20} />
                </button>
                <p className="booking-disclaimer">By submitting, you agree that our branch staff may call or SMS you regarding this reservation.</p>
              </form>
            </>
          )}
        </section>
      </div>

      <footer className="booking-footer" style={{
        textAlign: 'center',
        padding: '24px 16px 36px',
        color: '#6d5357',
        fontSize: '0.88rem',
        lineHeight: 1.8
      }}>
        <div style={{ marginBottom: '6px' }}>
          © {new Date().getFullYear()} WJ Wellness Spa <span>·</span> 2nd Floor JJMB Building, Brgy Gaya-gaya, SJDM Bulacan
        </div>
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #ebd9dc',
          display: 'inline-block'
        }}>
          <strong style={{ color: '#881c2d', letterSpacing: '0.04em' }}>
            📞 Contact Us Now: <a href="tel:09358548741" style={{ color: '#881c2d', textDecoration: 'none', fontWeight: 800 }}>0935-8548-741</a>
          </strong>
        </div>
      </footer>
    </div>
  );
}
