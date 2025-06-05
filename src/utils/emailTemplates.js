/**
 * Render a modern, branded HTML email for Fellas Spa & Barbershop.
 * @param {Object} opts
 * @param {string} opts.title - Main heading
 * @param {string} opts.body - Main HTML content (can include <p>, <ul>, etc.)
 * @param {Object} [opts.cta] - Optional call-to-action { label, url }
 * @param {string} [opts.footer] - Optional footer text
 * @returns {string} HTML email
 */
function renderEmail({ title, body, cta, footer }) {
  return `
  <html>
    <body style="background:#111;color:#FFD700;font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;">
      <div style="max-width:600px;margin:40px auto;background:#181818;border-radius:12px;box-shadow:0 2px 16px #0003;overflow:hidden;">
        <div style="background:#111;padding:32px 32px 16px 32px;text-align:center;">
          <img src="https://fellasspa.com/logo.png" alt="Fellas Spa & Barbershop" style="height:48px;margin-bottom:16px;" />
          <h1 style="font-family:'Playfair Display',serif;font-size:2rem;color:#FFD700;margin:0 0 8px 0;">${title}</h1>
        </div>
        <div style="padding:24px 32px 16px 32px;font-size:1.1rem;line-height:1.7;color:#FFD700;font-family:'Segoe UI',Arial,sans-serif;">
          ${body}
          ${cta ? `
            <div style="margin:32px 0;text-align:center;">
              <a href="${cta.url}" style="background:#FFD700;color:#181818;font-weight:bold;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:1.1rem;display:inline-block;">
                ${cta.label}
              </a>
            </div>
          ` : ""}
        </div>
        <div style="background:#181818;padding:16px 32px;text-align:center;font-size:0.95rem;color:#BFA14A;">
          ${footer || "Fellas Spa & Barbershop &bull; Luxury Grooming & Wellness"}
        </div>
      </div>
    </body>
  </html>
  `;
}

module.exports = { renderEmail };
