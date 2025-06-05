const nodemailer = require("nodemailer");

// Configure transporter (use environment variables for real SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "user@example.com",
    pass: process.env.SMTP_PASS || "password",
  },
});

/**
 * Send an email notification.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
async function sendEmail({ to, subject, html }) {
  if (!to) throw new Error("Recipient email required");
  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"Fellas Spa" <no-reply@fellasspa.com>',
    to,
    subject,
    html,
  });
}

/**
 * Send an SMS notification using Twilio.
 * @param {string} to - Recipient phone number (E.164 format, e.g. +2547XXXXXXX)
 * @param {string} body - SMS message body
 * @returns {Promise}
 */
async function sendSMS({ to, body }) {
  if (!to) throw new Error("Recipient phone number required");
  if (!body) throw new Error("SMS body required");
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!accountSid || !authToken || !from) throw new Error("Twilio credentials not set");
  const twilio = require("twilio")(accountSid, authToken);
  return twilio.messages.create({
    body,
    from,
    to,
  });
}

module.exports = { sendEmail, sendSMS };
