const db = require('./db');

db.pragma('foreign_keys = OFF');
db.exec('DELETE FROM appointments');
db.exec('DELETE FROM payments');
db.exec('DELETE FROM services');

const insertService = db.prepare(`
  INSERT INTO services (name, description, price, duration_minutes)
  VALUES (?, ?, ?, ?)
`);

const services = [
  ['WJ Back Massage', 'Focused relief targeting upper and lower back muscle tension, knots, and daily fatigue.', 300, 30],
  ['WJ Signature Massage', 'Our flagship 1-hour full body restorative massage blending Swedish relaxation and acupressure strokes.', 500, 60],
  ['WJ Premium Massage', 'Extended 90-minute full body therapy for deeper relaxation, improved blood flow, and stress relief.', 800, 90],
  ['WJ Deluxe Massage +ventosa', '90-minute soothing massage combined with therapeutic cupping (ventosa) to release trapped body heat and tension.', 800, 90],
  ['WJ Luxury Massage +body scrub', '90-minute indulgent package including full body massage and deep-cleansing organic body scrub.', 900, 90],
  ['WJ Executive Massage +hot stone', '90-minute premier massage utilizing warm volcanic basalt stones to melt away deep-seated muscular stiffness.', 900, 90],
  ['WJ Superior Massage Package 1', 'Ultimate 2-hour pampering package featuring full body massage paired with rejuvenating body scrub and traditional ventosa.', 1200, 120],
  ['WJ Superior Package 2', 'Luxurious 2-hour wellness ritual with full body massage, exfoliating body scrub, and restorative hot stone therapy.', 1300, 120],
  ['Couples Massage', 'Synchronized full body relaxing massage for two in our private sanctuary room or home service.', 1000, 60],
  ['Deep Tissue', 'Firm, targeted therapeutic pressure addressing chronic muscle pain, posture strain, and sports tightness.', 900, 60],
  ['Foot Reflex', '30-minute reflexology treatment stimulating pressure points on feet and calves to restore overall balance.', 400, 30],
  ['Ear Candling', 'Gentle natural therapy to clear ear canal passages, promote relaxation, and relieve pressure.', 250, 30],
  ['Ventosa', 'Traditional cupping therapy to draw out body cold, muscle spasms, and improve vital circulation.', 300, 30],
  ['Body Scrub', 'Invigorating 30-minute full body polish removing dead skin cells for radiant, velvety-soft skin.', 400, 30],
  ['Hot Stone', 'Warm volcanic stone therapy applied to key energy points to ease stress and relax muscle tissues.', 400, 30]
];

for (const s of services) {
  insertService.run(s[0], s[1], s[2], s[3]);
}

db.pragma('foreign_keys = ON');

console.log('SUCCESS: Seeded all', services.length, 'services from WJ Wellness Spa menu.');
