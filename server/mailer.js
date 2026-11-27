const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || process.env.SMTP_USER || '';
const GMAIL_PASS = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'WJ Wellness Spa';

let transporter = null;

if (GMAIL_USER && GMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    }
  });
  console.log(`[mailer] Configured live Gmail transporter with user: ${GMAIL_USER}`);
} else {
  console.log('[mailer] No GMAIL_USER / GMAIL_APP_PASSWORD found in .env. Operating in logging mode.');
}

async function sendMail({ to, subject, html, text }) {
  if (!to || !to.includes('@')) {
    console.log(`[mailer] Skipped sending email: invalid or missing address "${to}"`);
    return { success: false, reason: 'Invalid email address' };
  }

  const mailOptions = {
    from: `"${FROM_NAME}" <${GMAIL_USER || 'no-reply@wj-wellness.com'}>`,
    to,
    subject,
    text: text || '',
    html
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[mailer] Email successfully sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, live: true };
    } catch (err) {
      console.error(`[mailer] Failed to send email to ${to}:`, err.message);
      return { success: false, error: err.message, live: false };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[MAILER NOTIFICATION DISPATCHED (Simulation Mode)]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || 'HTML Content'}`);
    console.log(`======================================================\n`);
    return { success: true, live: false, simulated: true };
  }
}

/**
 * 1. Booking Confirmation Email
 */
async function sendBookingConfirmedEmail({ to, customerName, serviceName, therapistName, date, time, duration }) {
  const subject = `Appointment Confirmed: ${serviceName} at 2 Hands Wellness`;
  const text = `Hi ${customerName}, your appointment for ${serviceName} on ${date} at ${time} has been confirmed. Therapist: ${therapistName || 'Any Available Therapist'}. Location: Quirino Highway, San Jose del Monte, Bulacan.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f4f7f4; margin: 0; padding: 20px; color: #1e3328; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #d9e5dc; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: #14382e; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 10px 0 0; font-size: 22px; letter-spacing: 0.05em; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #b5cbbb; letter-spacing: 0.1em; text-transform: uppercase; }
    .badge { display: inline-block; background: #c89d53; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 10px; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 16px; font-weight: 700; color: #173b32; margin-bottom: 12px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fbfdfb; border: 1px solid #e1ebe3; border-radius: 10px; overflow: hidden; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #eef4f0; font-size: 14px; }
    .details-table td.label { color: #617769; font-weight: 600; width: 35%; }
    .details-table td.value { color: #14382e; font-weight: 700; }
    .note-box { background: #edf6f0; border-left: 4px solid #236544; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; color: #365041; line-height: 1.5; }
    .footer { background: #f9fbf9; padding: 20px 24px; text-align: center; font-size: 12px; color: #788d80; border-top: 1px solid #eef3ef; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 28px;">🌿</div>
      <h1>2 HANDS MASSAGE & WELLNESS</h1>
      <p>San Jose del Monte, Bulacan Branch</p>
      <div class="badge">✓ APPOINTMENT CONFIRMED</div>
    </div>
    <div class="content">
      <div class="greeting">Magandang araw, ${customerName}!</div>
      <p style="font-size: 14px; line-height: 1.6; color: #405748; margin: 0;">
        Ikinagagalak naming ipaalam na <strong>kumpirmado na ang inyong appointment</strong>. Inihahanda na ng aming team ang inyong wellness session.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">📅 Petsa:</td>
          <td class="value">${date}</td>
        </tr>
        <tr>
          <td class="label">⏰ Oras:</td>
          <td class="value">${time} (${duration || 60} mins)</td>
        </tr>
        <tr>
          <td class="label">💆 Serbisyo:</td>
          <td class="value">${serviceName}</td>
        </tr>
        <tr>
          <td class="label">👤 Assigned Therapist:</td>
          <td class="value">${therapistName || 'Any Available Professional Therapist'}</td>
        </tr>
        <tr>
          <td class="label">📍 Lokasyon:</td>
          <td class="value">Quirino Highway, San Jose del Monte, Bulacan</td>
        </tr>
      </table>

      <div class="note-box">
        <strong>💡 Branch Reminder:</strong> Mangyaring dumating 10–15 minuto bago ang nakatakdang oras para sa inyong pre-massage consultation at warm welcome drink. Kung kailangang mag-reschedule, maaari po kayong tumawag o mag-text sa ating reception.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} 2 Hands Massage & Wellness · Quirino Highway, SJDM, Bulacan<br>
      Para sa mga katanungan, sumagot lamang sa email na ito o tumawag sa branch desk.
    </div>
  </div>
</body>
</html>
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * 2. Advance Appointment Reminder (1 Hour and 30 Mins Before Session)
 */
async function sendAdvanceReminderEmail({
  to,
  customerName,
  serviceName,
  therapistName,
  date,
  time,
  arriveByTime,
  totalAmount = 0,
  hasRoom = false,
  minutesBefore = 60
}) {
  const isOneHour = minutesBefore === 60;
  const timeLabel = isOneHour ? '1 oras' : '30 minuto';
  const formattedAmount = `₱${Number(totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const subject = `⏰ PAALALA: May Appointment Kayo sa WJ Wellness Spa sa loob ng ${timeLabel} (${time})`;
  
  const text = `Magandang araw po, ${customerName}!

Paalala po mula sa WJ Wellness Spa para sa inyong appointment ngayong araw:
- Petsa: ${date || 'Ngayong Araw'}
- Oras ng Session: ${time}
- Oras na Dapat Andito Na Kayo: ${arriveByTime || time} (5-10 minuto bago ang session)
- Serbisyo: ${serviceName} ${hasRoom ? '(May Private Room)' : ''}
- Assigned Therapist: ${therapistName || 'Available Therapist'}
- Halagang Babayaran (Total Bill): ${formattedAmount}
- Lokasyon: 2nd Floor JJMB Building, Brgy. Gaya-gaya, San Jose del Monte, Bulacan (📞 0935-8548-741)

Inaanyayahan po namin kayong pumunta sa itinakdang oras para sa agarang relaxation. Salamat po!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fdf6f7; margin: 0; padding: 20px; color: #2d1116; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 2px solid #881c2d; box-shadow: 0 8px 28px rgba(136,28,45,0.14); }
    .header { background: linear-gradient(135deg, #881c2d 0%, #570c19 100%); padding: 28px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #ffd6dc; text-transform: uppercase; letter-spacing: 0.08em; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 20px; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.4); margin-bottom: 6px; }
    .content { padding: 30px 24px; text-align: center; }
    .clock-icon { font-size: 40px; margin-bottom: 6px; }
    .title { font-size: 21px; font-weight: 800; color: #570c19; margin: 0 0 10px; }
    .msg { font-size: 15px; color: #4a282e; line-height: 1.6; margin: 0 auto 20px; max-width: 480px; }
    
    .alert-box { background: #fff3f5; border: 2px dashed #e89da9; border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: center; }
    .alert-box strong { font-size: 16px; color: #881c2d; display: block; }
    .alert-box span { font-size: 13px; color: #692d37; }

    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: left; background: #fffdfd; border: 1px solid #ebd9dc; border-radius: 12px; overflow: hidden; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #f5eaec; font-size: 14px; }
    .details-table tr:last-child td { border-bottom: none; }
    .details-table td.label { color: #7a5057; font-weight: 600; width: 40%; }
    .details-table td.value { color: #2d1116; font-weight: 700; }
    .price-highlight { color: #881c2d; font-size: 17px; font-weight: 900; }

    .footer { background: #faf4f5; padding: 18px 20px; text-align: center; font-size: 12px; color: #785a60; border-top: 1px solid #f2e1e3; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">⏰ APPOINTMENT REMINDER (${timeLabel.toUpperCase()} NALANG)</div>
      <h1>WJ WELLNESS SPA</h1>
      <p>JJMB Building, Brgy. Gaya-gaya, SJDM Bulacan</p>
    </div>
    <div class="content">
      <div class="clock-icon">💆‍♂️✨</div>
      <h2 class="title">Handa na po ang inyong Iskedyul!</h2>
      <p class="msg">
        Magandang araw po, <strong>${customerName}</strong>! Ipinapaalala po namin ang inyong spa reservation sa WJ Wellness Spa. Narito po ang buong detalye ng inyong appointment:
      </p>

      <!-- ORAS NA DAPAT ANDON NA SILA -->
      <div class="alert-box">
        <strong>📍 Oras na Dapat Nandoon Na Kayo: ${arriveByTime || time}</strong>
        <span>(Magtungo po 10-15 minuto bago ang session para sa maayos na pag-check in)</span>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">📅 Petsa ng Appointment</td>
          <td class="value">${date || 'Ngayong Araw'}</td>
        </tr>
        <tr>
          <td class="label">⏰ Oras ng Session</td>
          <td class="value">${time}</td>
        </tr>
        <tr>
          <td class="label">💆 Serbisyo / Package</td>
          <td class="value">${serviceName} ${hasRoom ? '<span style="color:#881c2d;">(+Private Room)</span>' : ''}</td>
        </tr>
        <tr>
          <td class="label">👤 Assigned Therapist</td>
          <td class="value">${therapistName || 'Available On-Duty Therapist'}</td>
        </tr>
        <tr>
          <td class="label">💰 Halagang Babayaran (Total Bill)</td>
          <td class="value price-highlight">${formattedAmount}</td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #7a5057; margin: 0 0 10px;">
        Maaaring magbayad sa reception area gamit ang <strong>Cash, GCash, o Maya</strong> pagdating sa branch.
      </p>
    </div>
    <div class="footer">
      <strong>WJ Wellness Spa</strong><br>
      📍 2nd Floor JJMB Building, Brgy. Gaya-gaya, San Jose del Monte, Bulacan<br>
      📞 Hotline: <a href="tel:09358548741" style="color: #881c2d; font-weight: 700; text-decoration: none;">0935-8548-741</a>
    </div>
  </div>
</body>
</html>
  `;

  return sendMail({ to, subject, html, text });
}

module.exports = {
  sendMail,
  sendBookingConfirmedEmail,
  sendAdvanceReminderEmail
};
