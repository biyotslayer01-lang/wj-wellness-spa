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

// Migrations for discounts, reminders, room availment & therapist status/gender
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

  // Deactivate old placeholder therapists like "Therapist 1".."Therapist 7" and any old tests
  db.exec("UPDATE therapists SET active = 0 WHERE name LIKE 'Therapist %' OR name LIKE '%chynita%'");

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

function seed() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (existing > 0) return;

  const insertTherapist = db.prepare('INSERT INTO therapists (name, phone) VALUES (?, ?)');
  const therapistIds = [];
  for (let i = 1; i <= 7; i += 1) {
    therapistIds.push(insertTherapist.run(`Therapist ${i}`, '').lastInsertRowid);
  }

  const insertUser = db.prepare(`INSERT INTO users (full_name,email,password_hash,role,therapist_id)
    VALUES (?,?,?,?,?)`);
  const hash = (password) => bcrypt.hashSync(password, 12);
  insertUser.run('Business Owner', 'owner@2hands.demo', hash('Owner@123'), 'owner', null);
  insertUser.run('System Administrator', 'admin@2hands.demo', hash('Admin@123'), 'admin', null);
  insertUser.run('Front Desk Receptionist', 'reception@2hands.demo', hash('Reception@123'), 'receptionist', null);
  insertUser.run('Therapist 1', 'therapist@2hands.demo', hash('Therapist@123'), 'therapist', therapistIds[0]);

  const insertService = db.prepare(`INSERT INTO services (name,description,price,duration_minutes)
    VALUES (?,?,?,?)`);
  [
    ['Signature Massage', 'Our flagship full body combination massage blending Swedish strokes, Shiatsu acupressure, and gentle stretches.', 550, 60],
    ['Aromatherapy Swedish Massage', 'Deeply calming long strokes using customized therapeutic essential botanical oils.', 650, 60],
    ['Foot Spa & Reflexology', 'Relaxing warm mineral foot bath, peppermint scrub, and targeted pressure point reflexology.', 450, 60],
    ['Basic Facial Treatment', 'Gentle facial cleansing, soothing steam exfoliation, facial massage, and hydrating herbal mask.', 400, 45],
    ['Manicure & Hand Spa', 'Complete nail grooming, gentle cuticle care, hand scrub, and moisturizing hand massage.', 300, 45],
    ['Pedicure & Foot Scrub', 'Complete nail shaping, cuticle therapy, callus smoothing, and relaxing foot soak.', 350, 45]
  ].forEach((service) => insertService.run(...service));
}

seed();
module.exports = db;
