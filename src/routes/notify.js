const express = require("express");
const { sendEmail } = require("../utils/notify");
const { authenticateJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// Send a test email notification (Admin/Super Admin only)
router.post(
  "/email",
  authenticateJWT,
  requireRole(["Super Admin", "Admin"]),
  async (req, res) => {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "to, subject, and html are required" });
    }
    try {
      await sendEmail({ to, subject, html });
      res.json({ message: "Email sent" });
    } catch (err) {
      res.status(500).json({ error: "Failed to send email", details: err.message });
    }
  }
);

module.exports = router;
