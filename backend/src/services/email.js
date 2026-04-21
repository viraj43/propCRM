const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Production: use real SMTP credentials from .env
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Using production SMTP:', process.env.SMTP_HOST);
  } else {
    // Development: use Ethereal auto-generated test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Dev email via Ethereal:', testAccount.user);
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error('Recipient email is required');

  const transport = await getTransporter();

  const from = process.env.SMTP_FROM || '"PropCRM" <no-reply@propcrm.com>';

  const info = await transport.sendMail({ from, to, subject, text, html });

  // In dev, log the Ethereal preview URL so you can see the email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📬 Email preview URL:', previewUrl);
  }

  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendEmail };
