const express = require("express");
const { SalesLog, Booking, Employee, Store } = require("../../models");
const { authenticateJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /analytics/overview
 * Returns sales, bookings, and performance trends across all stores for the tenant.
 * Query: from, to (ISO date)
 */
router.get(
  "/overview",
  authenticateJWT,
  requireRole(["Admin", "Manager", "SuperAdmin"]),
  async (req, res) => {
    const tenantId = req.user.tenantId;
    const { from, to } = req.query;
    const where = { tenantId };
    if (from && to) {
      where.date = { $between: [from, to] };
    }
    try {
      // Sales by store
      const sales = await SalesLog.findAll({
        where,
        attributes: [
          "storeId",
          [require("sequelize").fn("sum", require("sequelize").col("totalPrice")), "totalSales"],
        ],
        group: ["storeId"],
      });
      // Bookings by store
      const bookings = await Booking.findAll({
        where,
        attributes: [
          "storeId",
          [require("sequelize").fn("count", require("sequelize").col("id")), "totalBookings"],
        ],
        group: ["storeId"],
      });
      // Employee performance (total sales per employee)
      const empPerf = await SalesLog.findAll({
        where,
        attributes: [
          "employeeId",
          [require("sequelize").fn("sum", require("sequelize").col("totalPrice")), "totalSales"],
        ],
        group: ["employeeId"],
      });
      res.json({
        sales,
        bookings,
        empPerf,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch analytics", details: err.message });
    }
  }
);

module.exports = router;
