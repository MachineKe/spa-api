const express = require("express");
const { AuditLog } = require("../../models");
const { authenticateJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get audit logs (Super Admin and Tenant Admin)
router.get(
  "/",
  authenticateJWT,
  requireRole(["Super Admin", "Admin"]),
  async (req, res) => {
    try {
      const where = {};
      // Super Admin: can see all, Tenant Admin: only their tenant
      if (req.user.role !== "Super Admin") {
        where.tenantId = req.user.tenantId;
      }
      // Optional filters: date range, userId, action
      if (req.query.startDate && req.query.endDate) {
        where.createdAt = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        };
      }
      if (req.query.userId) {
        where.userId = req.query.userId;
      }
      if (req.query.action) {
        where.action = req.query.action;
      }
      const logs = await AuditLog.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: 200,
      });
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs", details: err.message });
    }
  }
);

module.exports = router;
