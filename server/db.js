const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const configuredPath = process.env.DB_PATH || path.join(__dirname, 'data', '2hands.sqlite');
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(__dirname, '..', configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS therapists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','admin','receptionist','therapist')),
  therapist_id INTEGER REFERENCES therapists(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK(duration_minutes > 0),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  therapist_id INTEGER REFERENCES therapists(id) ON DELETE SET NULL,
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
  source TEXT NOT NULL DEFAULT 'online' CHECK(source IN ('online','walk-in','staff')),
  notes TEXT DEFAULT '',
  reminded_at TEXT DEFAULT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount REAL NOT NULL CHECK(amount >= 0),
  method TEXT NOT NULL CHECK(method IN ('Cash','GCash','Maya','Card','Other')),
  reference TEXT DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  sku TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  minimum_quantity REAL NOT NULL DEFAULT 5 CHECK(minimum_quantity >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  movement_type TEXT NOT NULL CHECK(movement_type IN ('stock-in','stock-out')),
  quantity REAL NOT NULL CHECK(quantity > 0),
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
`);

// Migrations for discounts, reminders, room availment, reminders tracking & therapist status/gender
try {
  const paymentCols = db.prepare("PRAGMA table_info(payments)").all().map((c) => c.name);
  if (!paymentCols.includes('discount_type')) {
    db.exec("ALTER TABLE payments ADD COLUMN discount_type TEXT DEFAULT 'None'");
  }
  if (!paymentCols.includes('discount_amount')) {
    db.exec("ALTER TABLE payments ADD COLUMN discount_amount REAL DEFAULT 0");
  }

  const apptCols = db.prepare("PRAGMA table_info(appointments)").all().map((c) => c.name);
  if (!apptCols.includes('reminded_at')) {
    db.exec("ALTER TABLE appointments ADD COLUMN reminded_at TEXT DEFAULT NULL");
  }
  if (!apptCols.includes('reminder_1h_sent')) {
    db.exec("ALTER TABLE appointments ADD COLUMN reminder_1h_sent INTEGER NOT NULL DEFAULT 0");
  }
  if (!apptCols.includes('reminder_30m_sent')) {
    db.exec("ALTER TABLE appointments ADD COLUMN reminder_30m_sent INTEGER NOT NULL DEFAULT 0");
  }
  if (!apptCols.includes('has_room')) {
    db.exec("ALTER TABLE appointments ADD COLUMN has_room INTEGER NOT NULL DEFAULT 0");
  }
  if (!apptCols.includes('room_fee')) {
    db.exec("ALTER TABLE appointments ADD COLUMN room_fee REAL NOT NULL DEFAULT 0");
  }

  const therapistCols = db.prepare("PRAGMA table_info(therapists)").all().map((c) => c.name);
  if (!therapistCols.includes('gender')) {
    db.exec("ALTER TABLE therapists ADD COLUMN gender TEXT DEFAULT 'female'");
  }
  if (!therapistCols.includes('is_absent')) {
    db.exec("ALTER TABLE therapists ADD COLUMN is_absent INTEGER NOT NULL DEFAULT 0");
  }
} catch (_err) {
  // columns already exist
}

// Ensure the exact WJ Wellness Spa therapist roster exists and is configured
try {
  const maleTherapists = ['STEPHEN', 'PAUL', 'JEROME', 'JAME', 'DYLAN', 'KYLE', 'TERRENCE'];
  const femaleTherapists = ['QUEEN', 'ALLIAH', 'ROSE', 'ELLA', 'CHELSEA', 'CLAIRE'];

  const findTherapist = db.prepare('SELECT id FROM therapists WHERE UPPER(name) = ?');
  const insertTherapist = db.prepare('INSERT INTO therapists (name, phone, gender, is_absent, active) VALUES (?, ?, ?, 0, 1)');
  const updateTherapist = db.prepare('UPDATE therapists SET gender = ?, active = 1 WHERE UPPER(name) = ?');

  // Permanently purge any old numbered therapists ("Therapist 1", "Therapist 2", etc.) or test records
  db.exec("DELETE FROM therapists WHERE name LIKE 'Therapist %' OR name LIKE '%chynita%'");

  for (const name of maleTherapists) {
    const row = findTherapist.get(name);
    if (!row) {
      insertTherapist.run(name, '', 'male');
    } else {
      updateTherapist.run('male', name);
    }
  }

  for (const name of femaleTherapists) {
    const row = findTherapist.get(name);
    if (!row) {
      insertTherapist.run(name, '', 'female');
    } else {
      updateTherapist.run('female', name);
    }
  }
} catch (e) {
  console.error('Error synchronizing therapists:', e);
}

// Ensure all WJ Wellness Spa services exist and are active
try {
  const defaultServices = [
    ['WJ Back Massage', 'Relieves tension and muscle tightness in the upper and lower back.', 300, 30],
    ['WJ Signature Massage', 'Our flagship full body combination massage blending Swedish strokes, Shiatsu acupressure, and gentle stretches.', 500, 60],
    ['WJ Premium Massage', 'Premium full body therapeutic massage with customized pressure and soothing oils.', 800, 90],
    ['WJ Deluxe Massage +ventosa', 'Deep therapeutic massage paired with traditional heated cup suction ventosa.', 800, 90],
    ['WJ Luxury Massage +body scrub', 'Full body relaxation massage combined with an exfoliating herbal body scrub.', 900, 90],
    ['WJ Executive Massage +hot stone', 'Soothing full body massage using smooth heated basalt stones to melt away deep tension.', 900, 90],
    ['WJ Superior Massage Package 1', 'Combination package including Signature Massage, Ventosa, and Ear Candling.', 1200, 120],
    ['WJ Superior Package 2', 'Ultimate rejuvenation package: Full Body Scrub, Hot Stone Therapy, and Signature Massage.', 1300, 120],
    ['Couples Massage', 'Synchronized full-body massage for two in a private room.', 1000, 60],
    ['Deep Tissue', 'Targeted firm pressure targeting deep muscle layers, chronic knots, and tension.', 900, 60],
    ['Foot Reflex', 'Relaxing foot treatment targeting acupressure points to improve circulation and reduce stress.', 400, 60],
    ['Ear Candling', 'Gentle holistic ear cleansing that promotes relaxation and relieves sinus pressure.', 250, 30],
    ['Ventosa', 'Traditional cupping therapy to relieve trapped body coldness, fatigue, and stiffness.', 300, 30],
    ['Body Scrub', 'Deep skin exfoliation removing dead skin cells and leaving skin soft, smooth, and glowing.', 400, 45],
    ['Hot Stone', 'Warm volcanic basalt stone treatment promoting deep muscle relaxation and circulation.', 400, 45]
  ];

  const findSvc = db.prepare('SELECT id FROM services WHERE UPPER(name) = ?');
  const insertSvc = db.prepare('INSERT INTO services (name, description, price, duration_minutes, active) VALUES (?, ?, ?, ?, 1)');
  const updateSvc = db.prepare('UPDATE services SET price = ?, duration_minutes = ?, active = 1 WHERE UPPER(name) = ?');

  for (const [name, desc, price, dur] of defaultServices) {
    const row = findSvc.get(name.toUpperCase());
    if (!row) {
      insertSvc.run(name, desc, price, dur);
    } else {
      updateSvc.run(price, dur, name.toUpperCase());
    }
  }
} catch (e) {
  console.error('Error synchronizing services:', e);
}

// Ensure only Business Owner exists as default user (remove System Administrator placeholder)
try {
  db.exec("DELETE FROM users WHERE email LIKE '%admin%' OR role = 'admin'");
  const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (existingUsers === 0) {
    const insertUser = db.prepare(`INSERT INTO users (full_name,email,password_hash,role,therapist_id) VALUES (?,?,?,?,?)`);
    const hash = (password) => bcrypt.hashSync(password, 12);
    insertUser.run('Business Owner', 'owner@wjwellness.com', hash('Owner@123'), 'owner', null);
  }
} catch (e) {
  console.error('Error synchronizing users:', e);
}

module.exports = db;
