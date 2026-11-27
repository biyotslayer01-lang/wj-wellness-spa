require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Manila';
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const mailer = require('./mailer');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-change-before-deployment';
if (isProduction && JWT_SECRET === 'development-only-secret-change-before-deployment') {
  throw new Error('Set a strong JWT_SECRET in the production environment before starting the server.');
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && crypto.timingSafeEqual(first, second);
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', application: '2 Hands Wellness Management System' }));

app.get('/api/auth/csrf', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  });
  res.json({ csrfToken: token });
});

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.get('x-csrf-token');
  if (!safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Security check failed. Refresh the page and try again.' });
  }
  next();
}
app.use('/api', requireCsrf);

function signInCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '8h', issuer: '2hands-wellness' });
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  });
}

function publicUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    therapist_id: user.therapist_id || null
  };
}

function authenticate(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: '2hands-wellness' });
    const user = db.prepare('SELECT id,full_name,email,role,therapist_id,active FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) {
      res.clearCookie('auth_token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
      return res.status(401).json({ error: 'This account is inactive. Contact the administrator.' });
    }
    req.user = user;
    next();
  } catch (_error) {
    res.clearCookie('auth_token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

const allow = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  next();
};
const staff = allow('owner', 'admin', 'receptionist');
const managers = allow('owner', 'admin');

function audit(userId, action, entity, entityId, details = '') {
  db.prepare(`INSERT INTO audit_logs (user_id,action,entity,entity_id,details) VALUES (?,?,?,?,?)`)
    .run(userId || null, action, entity, entityId || null, String(details).slice(0, 500));
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function branchHours(_date) {
  return '14:00';
}
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  // Business day starts at 14:00 (14 * 60 = 840 mins) and runs until 03:00 next morning (27 * 60 = 1620 mins)
  // Times 00:00 to 03:00 are treated as past midnight (add 24 hours = 1440 mins)
  if (h < 6) {
    return (h + 24) * 60 + m;
  }
  return h * 60 + m;
}
function withinBusinessHours(_date, startTime, endTime) {
  const startMins = parseTimeToMinutes(startTime);
  let endMins = parseTimeToMinutes(endTime);
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  const openMins = 14 * 60; // 2:00 PM (14:00)
  const closeMins = 27 * 60; // 3:00 AM (03:00 next day)
  return startMins >= openMins && endMins <= closeMins;
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}
function validTime(value) { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function addMinutes(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + Number(minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function overlaps(therapistId, date, startTime, endTime, excludeId = null) {
  if (!therapistId) return false;
  const row = db.prepare(`SELECT id FROM appointments
    WHERE therapist_id = ? AND appointment_date = ? AND status != 'cancelled'
      AND start_time < ? AND end_time > ? AND (? IS NULL OR id != ?)
    LIMIT 1`).get(therapistId, date, endTime, startTime, excludeId, excludeId);
  return Boolean(row);
}
function customerOverlaps(customerId, date, startTime, endTime, excludeId = null) {
  if (!customerId) return false;
  const row = db.prepare(`SELECT id FROM appointments
    WHERE customer_id = ? AND appointment_date = ? AND status != 'cancelled'
      AND start_time < ? AND end_time > ? AND (? IS NULL OR id != ?)
    LIMIT 1`).get(customerId, date, endTime, startTime, excludeId, excludeId);
  return Boolean(row);
}
function appointmentRows(where = '', params = []) {
  return db.prepare(`SELECT a.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
      s.name AS service_name, s.price AS service_price, s.duration_minutes,
      t.name AS therapist_name, CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS is_paid
    FROM appointments a
    JOIN customers c ON c.id = a.customer_id
    JOIN services s ON s.id = a.service_id
    LEFT JOIN therapists t ON t.id = a.therapist_id
    LEFT JOIN payments p ON p.appointment_id = a.id
    ${where}
    ORDER BY a.appointment_date DESC, a.start_time DESC`).all(...params);
}

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password || email.length > 180 || password.length > 200) {
    return res.status(400).json({ error: 'Enter your email address and password.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  signInCookie(res, user);
  audit(user.id, 'LOGIN', 'user', user.id, 'Successful sign in');
  res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const currentPassword = String(req.body?.current_password || '');
  const newPassword = String(req.body?.new_password || '');
  if (newPassword.length < 10 || newPassword.length > 200) return res.status(400).json({ error: 'Your new password must contain at least 10 characters.' });
  const row = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
  if (!row) return res.status(400).json({ error: 'Your current password is incorrect.' });
  const currentMatches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!currentMatches) return res.status(400).json({ error: 'Your current password is incorrect.' });
  const newHash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(newHash, req.user.id);
  signInCookie(res, req.user);
  audit(req.user.id, 'PASSWORD_CHANGE', 'user', req.user.id, 'Password changed by account holder');
  res.json({ message: 'Password changed successfully.' });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  audit(req.user.id, 'LOGOUT', 'user', req.user.id, 'User signed out');
  res.clearCookie('auth_token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
  res.json({ message: 'Signed out successfully.' });
});

// Public booking page: customers can request an appointment without seeing internal records.
app.get('/api/public/services', (_req, res) => {
  const services = db.prepare('SELECT id,name,description,price,duration_minutes FROM services WHERE active = 1 ORDER BY price ASC, name ASC').all();
  res.json({ services });
});
app.get('/api/public/therapists', (_req, res) => {
  const therapists = db.prepare('SELECT id,name,gender,is_absent FROM therapists WHERE active = 1 ORDER BY gender ASC, name ASC').all();
  res.json({ therapists });
});
app.post('/api/public/appointments', (req, res) => {
  const fullName = String(req.body?.full_name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const cleanPhone = phone.replace(/\D/g, '');
  const email = String(req.body?.email || '').trim();
  const serviceId = Number(req.body?.service_id);
  const therapistId = req.body?.therapist_id ? Number(req.body.therapist_id) : null;
  const date = String(req.body?.appointment_date || '');
  const startTime = String(req.body?.start_time || '');
  const notes = String(req.body?.notes || '').trim();
  const hasRoom = req.body?.has_room ? 1 : 0;
  const roomFee = hasRoom ? 100 : 0;
  if (!fullName || fullName.length > 120 || cleanPhone.length !== 11 || !Number.isInteger(serviceId) || !validDate(date) || !validTime(startTime)) {
    return res.status(400).json({ error: 'Please provide a valid 11-digit mobile number (e.g. 09XXXXXXXXX) and complete your booking details.' });
  }
  if (date < todayLocal()) return res.status(400).json({ error: 'Please choose today or a future date.' });
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) return res.status(400).json({ error: 'Please select an available service.' });
  if (therapistId) {
    const therapistRow = db.prepare('SELECT id, is_absent FROM therapists WHERE id = ? AND active = 1').get(therapistId);
    if (!therapistRow) {
      return res.status(400).json({ error: 'Please select an available therapist or leave the preference blank.' });
    }
    if (therapistRow.is_absent) {
      return res.status(400).json({ error: 'The selected therapist is currently marked ABSENT today. Please choose another therapist.' });
    }
  }
  const endTime = addMinutes(startTime, service.duration_minutes);
  if (!withinBusinessHours(date, startTime, endTime)) {
    return res.status(400).json({ error: 'Appointments must fit within branch hours: 2:00 PM to 3:00 AM daily.' });
  }
  const customer = db.prepare('SELECT id, full_name, email FROM customers WHERE phone = ? ORDER BY id LIMIT 1').get(cleanPhone);
  const create = db.transaction(() => {
    let customerId = customer?.id;
    if (customerId) {
      if (email && !customer.email) {
        db.prepare('UPDATE customers SET email = ? WHERE id = ?').run(email, customerId);
      }
    } else {
      customerId = db.prepare('INSERT INTO customers (full_name,phone,email) VALUES (?,?,?)').run(fullName, cleanPhone, email).lastInsertRowid;
    }
    if (customerOverlaps(customerId, date, startTime, endTime)) throw new Error('CUSTOMER_CONFLICT');
    if (overlaps(therapistId, date, startTime, endTime)) throw new Error('THERAPIST_CONFLICT');
    const result = db.prepare(`INSERT INTO appointments
      (customer_id,service_id,therapist_id,appointment_date,start_time,end_time,status,source,notes,has_room,room_fee)
      VALUES (?,?,?,?,?,?,'pending','online',?,?,?)`).run(customerId, serviceId, therapistId, date, startTime, endTime, notes, hasRoom, roomFee);
    return result.lastInsertRowid;
  });
  try {
    const id = create();
    res.status(201).json({ message: 'Your appointment request has been submitted. The branch will review and confirm your schedule.', appointment_id: id });
  } catch (error) {
    if (error.message === 'CUSTOMER_CONFLICT') return res.status(409).json({ error: 'You already have another appointment during that time. Please choose a different time.' });
    if (error.message === 'THERAPIST_CONFLICT') return res.status(409).json({ error: 'That therapist is already scheduled during this time. Please choose another therapist or time.' });
    throw error;
  }
});

app.use('/api', authenticate);

app.get('/api/dashboard', (req, res) => {
  const today = todayLocal();
  const therapistFilter = req.user.role === 'therapist' ? ' AND a.therapist_id = ?' : '';
  const params = req.user.role === 'therapist' ? [today, req.user.therapist_id] : [today];
  const todayCount = db.prepare(`SELECT COUNT(*) AS count FROM appointments a WHERE a.appointment_date = ? AND a.status != 'cancelled'${therapistFilter}`).get(...params).count;
  const pendingCount = req.user.role === 'therapist'
    ? db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE status='pending' AND therapist_id=?").get(req.user.therapist_id).count
    : db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE status='pending'").get().count;
  const salesToday = req.user.role === 'therapist' ? 0 : db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE date(paid_at)=?').get(today).total;
  const lowStock = req.user.role === 'therapist' ? 0 : db.prepare('SELECT COUNT(*) AS count FROM inventory_items WHERE active=1 AND quantity <= minimum_quantity').get().count;
  const nextAppointments = (req.user.role === 'therapist'
    ? appointmentRows("WHERE a.appointment_date >= ? AND a.therapist_id = ? AND a.status != 'cancelled'", [today, req.user.therapist_id])
    : appointmentRows("WHERE a.appointment_date >= ? AND a.status != 'cancelled'", [today]))
    .sort((a, b) => `${a.appointment_date} ${a.start_time}`.localeCompare(`${b.appointment_date} ${b.start_time}`)).slice(0, 6);
  const week = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = formatLocalDate(d);
    const total = req.user.role === 'therapist' ? 0 : db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE date(paid_at)=?').get(key).total;
    week.push({ date: key, label: d.toLocaleDateString('en-PH', { weekday: 'short' }), sales: total });
  }
  res.json({ stats: { todayAppointments: todayCount, pendingAppointments: pendingCount, salesToday, lowStock }, nextAppointments, salesTrend: week });
});

// Customers
app.get('/api/customers', staff, (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const customers = db.prepare(`SELECT c.*,
    (SELECT COUNT(*) FROM appointments a WHERE a.customer_id=c.id) AS appointment_count
    FROM customers c WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
    ORDER BY c.created_at DESC LIMIT 300`).all(search, search, search);
  res.json({ customers });
});
app.post('/api/customers', staff, (req, res) => {
  const name = String(req.body?.full_name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const email = String(req.body?.email || '').trim();
  const notes = String(req.body?.notes || '').trim();
  if (!name || name.length > 120 || phone.length > 40 || email.length > 180) return res.status(400).json({ error: 'Enter a valid customer name and contact details.' });
  const result = db.prepare('INSERT INTO customers (full_name,phone,email,notes) VALUES (?,?,?,?)').run(name, phone, email, notes);
  audit(req.user.id, 'CREATE', 'customer', result.lastInsertRowid, name);
  res.status(201).json({ message: 'Customer added successfully.' });
});
app.put('/api/customers/:id', staff, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.full_name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const email = String(req.body?.email || '').trim();
  const notes = String(req.body?.notes || '').trim();
  if (!name || name.length > 120 || phone.length > 40 || email.length > 180) return res.status(400).json({ error: 'Enter valid customer information.' });
  const result = db.prepare('UPDATE customers SET full_name=?,phone=?,email=?,notes=? WHERE id=?').run(name, phone, email, notes, id);
  if (!result.changes) return res.status(404).json({ error: 'Customer not found.' });
  audit(req.user.id, 'UPDATE', 'customer', id, name);
  res.json({ message: 'Customer updated successfully.' });
});

// Therapists
app.get('/api/therapists', (req, res) => {
  if (!['owner', 'admin', 'receptionist', 'therapist'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
  const therapists = req.user.role === 'therapist'
    ? db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM appointments a WHERE a.therapist_id=t.id AND a.status IN ('pending','confirmed')) AS active_appointments FROM therapists t WHERE t.id=?`).all(req.user.therapist_id)
    : db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM appointments a WHERE a.therapist_id=t.id AND a.status IN ('pending','confirmed')) AS active_appointments FROM therapists t ORDER BY t.gender ASC, t.name ASC`).all();
  res.json({ therapists });
});
app.post('/api/therapists', managers, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const gender = req.body?.gender === 'male' ? 'male' : 'female';
  if (!name || name.length > 120) return res.status(400).json({ error: 'Enter a therapist name.' });
  const result = db.prepare('INSERT INTO therapists (name,phone,gender,is_absent) VALUES (?,?,?,0)').run(name, phone, gender);
  audit(req.user.id, 'CREATE', 'therapist', result.lastInsertRowid, name);
  res.status(201).json({ message: 'Therapist added successfully.' });
});
app.put('/api/therapists/:id', managers, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const gender = req.body?.gender === 'male' ? 'male' : 'female';
  const active = req.body?.active === false ? 0 : 1;
  const isAbsent = req.body?.is_absent ? 1 : 0;
  if (!name || name.length > 120) return res.status(400).json({ error: 'Enter a therapist name.' });
  const result = db.prepare('UPDATE therapists SET name=?,phone=?,gender=?,active=?,is_absent=? WHERE id=?').run(name, phone, gender, active, isAbsent, id);
  if (!result.changes) return res.status(404).json({ error: 'Therapist not found.' });
  audit(req.user.id, 'UPDATE', 'therapist', id, `${name} (absent=${isAbsent})`);
  res.json({ message: 'Therapist updated successfully.' });
});

// Dedicated quick toggle for Attendance (ABSENT / PRESENT)
app.patch('/api/therapists/:id/attendance', staff, (req, res) => {
  const id = Number(req.params.id);
  const therapist = db.prepare('SELECT id, name, is_absent FROM therapists WHERE id = ?').get(id);
  if (!therapist) return res.status(404).json({ error: 'Therapist not found.' });
  const newStatus = req.body?.is_absent !== undefined ? (req.body.is_absent ? 1 : 0) : (therapist.is_absent ? 0 : 1);
  db.prepare('UPDATE therapists SET is_absent = ? WHERE id = ?').run(newStatus, id);
  audit(req.user.id, 'ATTENDANCE', 'therapist', id, `${therapist.name} marked ${newStatus ? 'ABSENT' : 'PRESENT'}`);
  res.json({ message: `${therapist.name} is now marked ${newStatus ? 'ABSENT' : 'PRESENT'}.`, is_absent: newStatus });
});

// Services
app.get('/api/services', (_req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY active DESC, price ASC, name ASC').all();
  res.json({ services });
});
app.post('/api/services', managers, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const price = Number(req.body?.price);
  const duration = Number(req.body?.duration_minutes || 60);
  if (!name || name.length > 120 || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration < 1 || duration > 600) return res.status(400).json({ error: 'Enter a valid service name, price, and duration.' });
  const result = db.prepare('INSERT INTO services (name,description,price,duration_minutes) VALUES (?,?,?,?)').run(name, description, price, duration);
  audit(req.user.id, 'CREATE', 'service', result.lastInsertRowid, name);
  res.status(201).json({ message: 'Service added successfully.' });
});
app.put('/api/services/:id', managers, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const price = Number(req.body?.price);
  const duration = Number(req.body?.duration_minutes || 60);
  const active = req.body?.active === false ? 0 : 1;
  if (!name || name.length > 120 || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration < 1 || duration > 600) return res.status(400).json({ error: 'Enter valid service details.' });
  const result = db.prepare('UPDATE services SET name=?,description=?,price=?,duration_minutes=?,active=? WHERE id=?').run(name, description, price, duration, active, id);
  if (!result.changes) return res.status(404).json({ error: 'Service not found.' });
  audit(req.user.id, 'UPDATE', 'service', id, name);
  res.json({ message: 'Service updated successfully.' });
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const conditions = [];
  const params = [];
  if (req.user.role === 'therapist') { conditions.push('a.therapist_id = ?'); params.push(req.user.therapist_id); }
  if (req.query.date && validDate(String(req.query.date))) { conditions.push('a.appointment_date = ?'); params.push(String(req.query.date)); }
  if (req.query.from && validDate(String(req.query.from))) { conditions.push('a.appointment_date >= ?'); params.push(String(req.query.from)); }
  if (req.query.to && validDate(String(req.query.to))) { conditions.push('a.appointment_date <= ?'); params.push(String(req.query.to)); }
  if (req.query.status && ['pending','confirmed','completed','cancelled'].includes(String(req.query.status))) { conditions.push('a.status = ?'); params.push(String(req.query.status)); }
  if (req.query.unpaid === '1') conditions.push('NOT EXISTS (SELECT 1 FROM payments p WHERE p.appointment_id=a.id)');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  res.json({ appointments: appointmentRows(where, params) });
});
app.post('/api/appointments', staff, (req, res) => {
  const customerId = Number(req.body?.customer_id);
  const serviceId = Number(req.body?.service_id);
  const therapistId = req.body?.therapist_id ? Number(req.body.therapist_id) : null;
  const date = String(req.body?.appointment_date || '');
  const startTime = String(req.body?.start_time || '');
  const source = req.body?.source === 'walk-in' ? 'walk-in' : (req.body?.source === 'online' ? 'online' : 'staff');
  const notes = String(req.body?.notes || '').trim();
  const hasRoom = req.body?.has_room ? 1 : 0;
  const roomFee = hasRoom ? 100 : 0;
  if (!Number.isInteger(customerId) || !Number.isInteger(serviceId) || !validDate(date) || !validTime(startTime)) return res.status(400).json({ error: 'Choose a customer, service, date, and start time.' });
  const customer = db.prepare('SELECT id FROM customers WHERE id=?').get(customerId);
  const service = db.prepare('SELECT * FROM services WHERE id=? AND active=1').get(serviceId);
  const therapist = therapistId ? db.prepare('SELECT id, is_absent FROM therapists WHERE id=? AND active=1').get(therapistId) : null;
  if (!customer || !service || (therapistId && !therapist)) return res.status(400).json({ error: 'One of the selected records is unavailable.' });
  if (therapist && therapist.is_absent) return res.status(400).json({ error: 'The selected therapist is currently marked ABSENT today.' });
  const endTime = addMinutes(startTime, service.duration_minutes);
  if (!withinBusinessHours(date, startTime, endTime)) return res.status(400).json({ error: 'Appointments must fit within branch hours: 2:00 PM to 3:00 AM daily.' });
  if (customerOverlaps(customerId, date, startTime, endTime)) return res.status(409).json({ error: 'This customer already has an appointment during that time.' });
  if (overlaps(therapistId, date, startTime, endTime)) return res.status(409).json({ error: 'The selected therapist is already booked during that time.' });
  const result = db.prepare(`INSERT INTO appointments (customer_id,service_id,therapist_id,appointment_date,start_time,end_time,status,source,notes,has_room,room_fee,created_by)
    VALUES (?,?,?,?,?,?,'pending',?,?,?,?,?)`).run(customerId, serviceId, therapistId, date, startTime, endTime, source, notes, hasRoom, roomFee, req.user.id);
  audit(req.user.id, 'CREATE', 'appointment', result.lastInsertRowid, `${date} ${startTime} (${source})`);
  res.status(201).json({ message: 'Appointment created successfully.', appointment_id: result.lastInsertRowid });
});
app.patch('/api/appointments/:id', staff, (req, res) => {
  const id = Number(req.params.id);
  const appointment = db.prepare('SELECT * FROM appointments WHERE id=?').get(id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

  const status = req.body?.status !== undefined ? String(req.body.status) : appointment.status;
  const therapistId = req.body?.therapist_id === undefined
    ? appointment.therapist_id
    : (req.body.therapist_id ? Number(req.body.therapist_id) : null);
  const serviceId = req.body?.service_id !== undefined ? Number(req.body.service_id) : appointment.service_id;
  const appointmentDate = req.body?.appointment_date !== undefined ? String(req.body.appointment_date) : appointment.appointment_date;
  const startTime = req.body?.start_time !== undefined ? String(req.body.start_time) : appointment.start_time;
  const notes = req.body?.notes !== undefined ? String(req.body.notes).trim() : appointment.notes;

  if (!['pending','confirmed','completed','cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid appointment status.' });
  }

  // Prevent cancelling an appointment that already has a recorded payment
  if (status === 'cancelled') {
    const hasPayment = db.prepare('SELECT id FROM payments WHERE appointment_id=?').get(id);
    if (hasPayment) {
      return res.status(400).json({ error: 'Cannot cancel an appointment with an existing payment record. Contact the branch manager.' });
    }
  }

  if (!validDate(appointmentDate) || !validTime(startTime)) {
    return res.status(400).json({ error: 'Invalid date or start time format.' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id=?').get(serviceId);
  if (!service) return res.status(400).json({ error: 'Selected service not found.' });

  const endTime = addMinutes(startTime, service.duration_minutes);
  if (!withinBusinessHours(appointmentDate, startTime, endTime)) {
    return res.status(400).json({ error: 'Appointments must fit within branch hours: 2:00 PM to 3:00 AM daily.' });
  }

  if (therapistId && !db.prepare('SELECT id FROM therapists WHERE id=? AND active=1').get(therapistId)) {
    return res.status(400).json({ error: 'Select an active therapist.' });
  }
  if (status === 'confirmed' && !therapistId) {
    return res.status(400).json({ error: 'Assign a therapist before confirming this appointment.' });
  }

  if (status !== 'cancelled') {
    if (customerOverlaps(appointment.customer_id, appointmentDate, startTime, endTime, id)) {
      return res.status(409).json({ error: 'This customer has another appointment scheduled during this time.' });
    }
    if (therapistId && overlaps(therapistId, appointmentDate, startTime, endTime, id)) {
      return res.status(409).json({ error: 'The selected therapist has another appointment during this time.' });
    }
  }

  db.prepare(`UPDATE appointments SET status=?, therapist_id=?, service_id=?, appointment_date=?, start_time=?, end_time=?, notes=? WHERE id=?`)
    .run(status, therapistId, serviceId, appointmentDate, startTime, endTime, notes, id);

  audit(req.user.id, 'UPDATE', 'appointment', id, `status=${status}; therapist=${therapistId || 'unassigned'}; date=${appointmentDate}; time=${startTime}`);

  // Send Gmail confirmation if appointment was just accepted / confirmed
  if (status === 'confirmed' && appointment.status !== 'confirmed') {
    const cust = db.prepare('SELECT full_name, email FROM customers WHERE id=?').get(appointment.customer_id);
    const ther = therapistId ? db.prepare('SELECT name FROM therapists WHERE id=?').get(therapistId) : null;
    if (cust && cust.email) {
      mailer.sendBookingConfirmedEmail({
        to: cust.email,
        customerName: cust.full_name,
        serviceName: service.name,
        therapistName: ther ? ther.name : '',
        date: appointmentDate,
        time: startTime,
        duration: service.duration_minutes
      }).catch((err) => console.error('[mailer] Error sending confirmation:', err.message));
    }
  }

  res.json({ message: 'Appointment updated successfully.' });
});

// Send Appointment Reminder Notification (1 Hour & 30 Mins Before Queue / Schedule)
app.post('/api/appointments/:id/remind', staff, async (req, res) => {
  const id = Number(req.params.id);
  const minutesBefore = req.body?.minutes === 30 ? 30 : 60;
  const appt = db.prepare(`SELECT a.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
      s.name AS service_name, t.name AS therapist_name
    FROM appointments a
    JOIN customers c ON c.id = a.customer_id
    JOIN services s ON s.id = a.service_id
    LEFT JOIN therapists t ON t.id = a.therapist_id
    WHERE a.id = ?`).get(id);

  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

  const flagColumn = minutesBefore === 30 ? 'reminder_30m_sent' : 'reminder_1h_sent';
  db.prepare(`UPDATE appointments SET reminded_at = datetime('now','localtime'), ${flagColumn} = 1 WHERE id = ?`).run(id);

  let emailSent = false;
  if (appt.customer_email) {
    const mailResult = await mailer.sendAdvanceReminderEmail({
      to: appt.customer_email,
      customerName: appt.customer_name,
      serviceName: appt.service_name,
      therapistName: appt.therapist_name,
      time: appt.start_time,
      minutesBefore
    });
    emailSent = mailResult.success;
  }

  const label = minutesBefore === 60 ? '1 hour' : '30 mins';
  audit(req.user.id, 'REMIND', 'appointment', id, `Sent ${label} advance reminder to ${appt.customer_name}`);

  const smsText = `Hi ${appt.customer_name}! Paalala mula sa WJ Wellness Spa: Ang inyong ${appt.service_name} session kasama si ${appt.therapist_name || 'Staff'} ay nakatakda ngayong ${appt.start_time} (sa loob ng ${label}). Maaari na po kayong maghanda. Salamat po!`;

  res.json({
    message: emailSent
      ? `Advance reminder (${label}) sent to ${appt.customer_name} via Gmail!`
      : `Advance reminder (${label}) recorded for ${appt.customer_name}.`,
    customer_name: appt.customer_name,
    customer_phone: appt.customer_phone,
    customer_email: appt.customer_email,
    sms_text: smsText
  });
});

// Automatic background reminder job: checks appointments every 2 minutes
setInterval(() => {
  try {
    const today = todayLocal();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const upcoming = db.prepare(`SELECT a.*, c.full_name AS customer_name, c.email AS customer_email,
        s.name AS service_name, t.name AS therapist_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services s ON s.id = a.service_id
      LEFT JOIN therapists t ON t.id = a.therapist_id
      WHERE a.appointment_date = ? AND a.status IN ('confirmed', 'pending')
        AND (a.reminder_1h_sent = 0 OR a.reminder_30m_sent = 0)`).all(today);

    for (const appt of upcoming) {
      if (!appt.customer_email) continue;
      const apptMinutes = parseTimeToMinutes(appt.start_time);
      const diff = apptMinutes - nowMinutes;

      // 1-hour reminder window (between 50 and 65 mins before start time)
      if (diff > 50 && diff <= 65 && !appt.reminder_1h_sent) {
        db.prepare("UPDATE appointments SET reminder_1h_sent = 1, reminded_at = datetime('now','localtime') WHERE id = ?").run(appt.id);
        mailer.sendAdvanceReminderEmail({
          to: appt.customer_email,
          customerName: appt.customer_name,
          serviceName: appt.service_name,
          therapistName: appt.therapist_name,
          time: appt.start_time,
          minutesBefore: 60
        }).catch((e) => console.error('[auto-remind 1h error]:', e.message));
        console.log(`[auto-remind] Sent 1-hour reminder for appt #${appt.id} to ${appt.customer_email}`);
      }

      // 30-min reminder window (between 20 and 35 mins before start time)
      if (diff > 20 && diff <= 35 && !appt.reminder_30m_sent) {
        db.prepare("UPDATE appointments SET reminder_30m_sent = 1, reminded_at = datetime('now','localtime') WHERE id = ?").run(appt.id);
        mailer.sendAdvanceReminderEmail({
          to: appt.customer_email,
          customerName: appt.customer_name,
          serviceName: appt.service_name,
          therapistName: appt.therapist_name,
          time: appt.start_time,
          minutesBefore: 30
        }).catch((e) => console.error('[auto-remind 30m error]:', e.message));
        console.log(`[auto-remind] Sent 30-min reminder for appt #${appt.id} to ${appt.customer_email}`);
      }
    }
  } catch (err) {
    console.error('[auto-remind interval error]:', err.message);
  }
}, 2 * 60 * 1000);

// Payments and transaction history. The system records payments; it does not process online transfers.
app.get('/api/transactions', staff, (req, res) => {
  const transactions = db.prepare(`SELECT p.*, c.full_name AS customer_name, s.name AS service_name,
      a.appointment_date, a.start_time, u.full_name AS received_by_name
    FROM payments p JOIN customers c ON c.id=p.customer_id
    JOIN appointments a ON a.id=p.appointment_id JOIN services s ON s.id=a.service_id
    LEFT JOIN users u ON u.id=p.received_by
    ORDER BY p.paid_at DESC LIMIT 500`).all();
  res.json({ transactions });
});
app.post('/api/payments', staff, (req, res) => {
  const appointmentId = Number(req.body?.appointment_id);
  const method = String(req.body?.method || 'Cash');
  const reference = String(req.body?.reference || '').trim();
  const appointment = db.prepare(`SELECT a.*, s.price, c.id AS customer_id FROM appointments a
    JOIN services s ON s.id=a.service_id JOIN customers c ON c.id=a.customer_id WHERE a.id=?`).get(appointmentId);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
  if (appointment.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointments cannot be paid.' });
  if (!['confirmed','completed'].includes(appointment.status)) return res.status(400).json({ error: 'Confirm the appointment before recording its payment.' });
  if (db.prepare('SELECT id FROM payments WHERE appointment_id=?').get(appointmentId)) return res.status(409).json({ error: 'A payment is already recorded for this appointment.' });
  if (!['Cash','GCash','Maya','Card','Other'].includes(method)) return res.status(400).json({ error: 'Choose a valid payment method.' });
  const amount = req.body?.amount === undefined || req.body?.amount === '' ? (Number(appointment.price) + Number(appointment.room_fee || 0)) : Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Enter a valid payment amount.' });
  const discountType = String(req.body?.discount_type || 'None');
  const discountAmount = Number(req.body?.discount_amount || 0);

  const recordPayment = db.transaction(() => {
    const result = db.prepare('INSERT INTO payments (appointment_id,customer_id,amount,method,reference,received_by,discount_type,discount_amount) VALUES (?,?,?,?,?,?,?,?)')
      .run(appointmentId, appointment.customer_id, amount, method, reference, req.user.id, discountType, discountAmount);
    if (appointment.status === 'confirmed') {
      db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appointmentId);
    }
    return result.lastInsertRowid;
  });

  const paymentId = recordPayment();
  audit(req.user.id, 'CREATE', 'payment', paymentId, `₱${amount.toFixed(2)} ${method}${discountType !== 'None' ? ` (${discountType} discount -₱${discountAmount})` : ''}`);
  res.status(201).json({ message: 'Payment recorded successfully.', payment_id: paymentId });
});

// Inventory
app.get('/api/inventory', staff, (req, res) => {
  const items = db.prepare(`SELECT i.*,
    (SELECT COUNT(*) FROM stock_movements m WHERE m.item_id=i.id) AS movement_count
    FROM inventory_items i WHERE i.active=1 ORDER BY (i.quantity <= i.minimum_quantity) DESC,i.name`).all();
  res.json({ items });
});
app.post('/api/inventory', managers, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'General').trim();
  const sku = String(req.body?.sku || '').trim();
  const unit = String(req.body?.unit || 'pcs').trim();
  const quantity = Number(req.body?.quantity || 0);
  const minimum = Number(req.body?.minimum_quantity || 0);
  if (!name || name.length > 120 || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minimum) || minimum < 0) return res.status(400).json({ error: 'Enter a valid item name and stock quantity.' });

  const createItem = db.transaction(() => {
    const result = db.prepare('INSERT INTO inventory_items (name,category,sku,unit,quantity,minimum_quantity) VALUES (?,?,?,?,?,?)')
      .run(name, category, sku, unit, quantity, minimum);
    const itemId = result.lastInsertRowid;
    if (quantity > 0) {
      db.prepare("INSERT INTO stock_movements (item_id,movement_type,quantity,note,created_by) VALUES (?,'stock-in',?,?,?)")
        .run(itemId, quantity, 'Initial stock', req.user.id);
    }
    return itemId;
  });

  const itemId = createItem();
  audit(req.user.id, 'CREATE', 'inventory_item', itemId, name);
  res.status(201).json({ message: 'Inventory item added successfully.', item_id: itemId });
});
app.put('/api/inventory/:id', managers, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'General').trim();
  const sku = String(req.body?.sku || '').trim();
  const unit = String(req.body?.unit || 'pcs').trim();
  const minimum = Number(req.body?.minimum_quantity || 0);
  if (!name || name.length > 120 || !Number.isFinite(minimum) || minimum < 0) return res.status(400).json({ error: 'Enter valid item information.' });
  const result = db.prepare(`UPDATE inventory_items SET name=?,category=?,sku=?,unit=?,minimum_quantity=?,updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, category, sku, unit, minimum, id);
  if (!result.changes) return res.status(404).json({ error: 'Inventory item not found.' });
  audit(req.user.id, 'UPDATE', 'inventory_item', id, name);
  res.json({ message: 'Inventory item updated successfully.' });
});
app.post('/api/inventory/:id/movements', managers, (req, res) => {
  const id = Number(req.params.id);
  const type = String(req.body?.movement_type || '');
  const quantity = Number(req.body?.quantity);
  const note = String(req.body?.note || '').trim();
  const item = db.prepare('SELECT * FROM inventory_items WHERE id=? AND active=1').get(id);
  if (!item) return res.status(404).json({ error: 'Inventory item not found.' });
  if (!['stock-in','stock-out'].includes(type) || !Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'Enter a valid stock movement and quantity.' });
  if (type === 'stock-out' && quantity > item.quantity) return res.status(400).json({ error: 'Stock-out quantity cannot exceed the available quantity.' });
  const transaction = db.transaction(() => {
    const newQuantity = type === 'stock-in' ? item.quantity + quantity : item.quantity - quantity;
    db.prepare(`UPDATE inventory_items SET quantity=?,updated_at=datetime('now','localtime') WHERE id=?`).run(newQuantity, id);
    db.prepare('INSERT INTO stock_movements (item_id,movement_type,quantity,note,created_by) VALUES (?,?,?,?,?)').run(id, type, quantity, note, req.user.id);
  });
  transaction();
  audit(req.user.id, type.toUpperCase(), 'inventory_item', id, `${quantity} ${item.unit}`);
  res.json({ message: `${type === 'stock-in' ? 'Stock-in' : 'Stock-out'} recorded successfully.` });
});
app.get('/api/inventory/:id/movements', staff, (req, res) => {
  const movements = db.prepare(`SELECT m.*,u.full_name AS user_name FROM stock_movements m
    LEFT JOIN users u ON u.id=m.created_by WHERE m.item_id=? ORDER BY m.created_at DESC LIMIT 100`).all(Number(req.params.id));
  res.json({ movements });
});

// Sales reporting
app.get('/api/reports', managers, (req, res) => {
  const period = ['daily','weekly','monthly'].includes(String(req.query.period)) ? String(req.query.period) : 'daily';
  const inputDate = validDate(String(req.query.date || '')) ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const date = new Date(`${inputDate}T00:00:00`);
  let from = inputDate;
  let to = inputDate;
  if (period === 'weekly') {
    const day = date.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(date); monday.setDate(date.getDate() - mondayOffset);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    from = formatLocalDate(monday); to = formatLocalDate(sunday);
  } else if (period === 'monthly') {
    from = `${inputDate.slice(0, 7)}-01`;
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    to = formatLocalDate(last);
  }
  const summary = db.prepare('SELECT COUNT(*) AS transaction_count,COALESCE(SUM(amount),0) AS total_sales FROM payments WHERE date(paid_at) BETWEEN ? AND ?').get(from, to);
  const transactions = db.prepare(`SELECT p.*,c.full_name AS customer_name,s.name AS service_name,a.appointment_date,a.start_time
    FROM payments p JOIN customers c ON c.id=p.customer_id JOIN appointments a ON a.id=p.appointment_id
    JOIN services s ON s.id=a.service_id WHERE date(p.paid_at) BETWEEN ? AND ? ORDER BY p.paid_at DESC`).all(from, to);
  const daily = db.prepare('SELECT date(paid_at) AS date,COALESCE(SUM(amount),0) AS sales,COUNT(*) AS count FROM payments WHERE date(paid_at) BETWEEN ? AND ? GROUP BY date(paid_at) ORDER BY date').all(from, to);
  const inventorySummary = db.prepare('SELECT COUNT(*) AS item_count,COALESCE(SUM(quantity),0) AS total_units,SUM(CASE WHEN quantity <= minimum_quantity THEN 1 ELSE 0 END) AS low_stock_count FROM inventory_items WHERE active=1').get();
  const therapistStats = db.prepare(`SELECT t.id, t.name,
      COUNT(a.id) AS services_completed,
      COALESCE(SUM(p.amount), 0) AS total_revenue
    FROM therapists t
    LEFT JOIN appointments a ON a.therapist_id = t.id AND a.status = 'completed' AND a.appointment_date BETWEEN ? AND ?
    LEFT JOIN payments p ON p.appointment_id = a.id
    WHERE t.active = 1
    GROUP BY t.id, t.name
    ORDER BY services_completed DESC, total_revenue DESC`).all(from, to);
  res.json({ period, from, to, summary, transactions, daily, inventorySummary, therapistStats });
});

// Database backup download for administrators and owners
app.get('/api/backup', managers, (req, res) => {
  const filename = `2hands-backup-${todayLocal()}.sqlite`;
  audit(req.user.id, 'BACKUP', 'database', null, 'Database backup downloaded');
  res.download(db.name, filename);
});

// User accounts
app.get('/api/users', managers, (req, res) => {
  const users = db.prepare(`SELECT u.id,u.full_name,u.email,u.role,u.active,u.therapist_id,t.name AS therapist_name,u.created_at
    FROM users u LEFT JOIN therapists t ON t.id=u.therapist_id ORDER BY u.created_at DESC`).all();
  res.json({ users });
});
app.post('/api/users', managers, async (req, res) => {
  const name = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || 'receptionist');
  const therapistId = req.body?.therapist_id ? Number(req.body.therapist_id) : null;
  if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 180 || password.length < 10 || !['admin','receptionist','therapist'].includes(role)) {
    return res.status(400).json({ error: 'Enter a valid name, email, role, and password of at least 10 characters. Owner accounts cannot be created here.' });
  }
  if (role === 'therapist' && (!therapistId || !db.prepare('SELECT id FROM therapists WHERE id=?').get(therapistId))) return res.status(400).json({ error: 'Choose the therapist record linked to this account.' });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (full_name,email,password_hash,role,therapist_id) VALUES (?,?,?,?,?)')
      .run(name, email, passwordHash, role, role === 'therapist' ? therapistId : null);
    audit(req.user.id, 'CREATE', 'user', result.lastInsertRowid, email);
    res.status(201).json({ message: 'User account created successfully.' });
  } catch (error) {
    if (String(error.code).includes('CONSTRAINT')) return res.status(409).json({ error: 'That email address is already registered.' });
    throw error;
  }
});
app.patch('/api/users/:id', managers, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id && req.body?.active === false) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  const active = req.body?.active === false ? 0 : 1;
  const result = db.prepare('UPDATE users SET active=? WHERE id=? AND role != \'owner\'').run(active, id);
  if (!result.changes) return res.status(404).json({ error: 'User not found or owner account cannot be changed here.' });
  audit(req.user.id, active ? 'ACTIVATE' : 'DEACTIVATE', 'user', id, 'Account status changed');
  res.json({ message: `User account ${active ? 'activated' : 'deactivated'} successfully.` });
});

app.delete('/api/users/:id', managers, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const target = db.prepare('SELECT role, full_name FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.role === 'owner') return res.status(400).json({ error: 'Owner account cannot be deleted.' });

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  audit(req.user.id, 'DELETE', 'user', id, `Deleted user ${target.full_name}`);
  res.json({ message: `User account ${target.full_name} deleted successfully.` });
});

app.get('/api/audit-logs', managers, (_req, res) => {
  const logs = db.prepare(`SELECT a.*,u.full_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`).all();
  res.json({ logs });
});

// Serve the compiled React app in production.
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: isProduction ? '1h' : 0 }));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something went wrong. Please try again. Check the server terminal for details.' });
});

app.listen(PORT, () => {
  console.log(`WJ Wellness Spa API running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${process.env.DB_PATH || './server/data/2hands.sqlite'}`);
});
