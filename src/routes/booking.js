const express = require('express');
const { body, validationResult } = require('express-validator');
const { Booking, Service, TeamMember, Tenant } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');
const { sendEmail } = require("../utils/notify");
const { renderEmail } = require("../utils/emailTemplates");

const router = express.Router();

// Public: Submit a new booking
router.post(
  '/public',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('serviceId').isInt(),
    body('date').isISO8601(),
    body('time').notEmpty(),
    body('tenantId').isInt(),
    body('notes').optional().isString(),
    body('staffId').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, serviceId, staffId, date, time, notes, tenantId } = req.body;
    try {
      // Validate tenant and service
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant || !tenant.isActive) return res.status(404).json({ error: 'Tenant not found' });
      const service = await Service.findByPk(serviceId);
      if (!service || service.tenantId !== tenant.id) return res.status(404).json({ error: 'Service not found for tenant' });

      // If staffId provided, validate staff
      if (staffId) {
        const staff = await TeamMember.findByPk(staffId);
        if (!staff || staff.tenantId !== tenant.id) return res.status(404).json({ error: 'Staff not found for tenant' });
      }

      const booking = await Booking.create({
        name,
        email,
        phone,
        serviceId,
        staffId,
        date,
        time,
        notes,
        tenantId,
        status: 'pending',
      });

      // Send confirmation email (non-blocking)
      sendEmail({
        to: email,
        subject: `Booking Confirmation - ${tenant.name}`,
        html: renderEmail({
          title: "Booking Confirmed",
          body: `
            <p>Hi ${name},</p>
            <p>Your booking for <b>${service.name}</b> on <b>${date}</b> at <b>${time}</b> has been received.</p>
            <p>We look forward to welcoming you.</p>
          `,
          cta: { label: "View Location", url: tenant.mapUrl || "https://fellasspa.com/location" },
        }),
      }).catch(() => {});

      res.status(201).json({ message: 'Booking submitted', booking });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit booking', details: err.message });
    }
  }
);

// Admin/Manager/Staff: List bookings for tenant
router.get(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff']),
  async (req, res) => {
    try {
      const bookings = await Booking.findAll({ where: { tenantId: req.user.tenantId } });
      res.json({ bookings });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
    }
  }
);

// Admin/Manager: Update booking status or details
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
    body('notes').optional().isString(),
    body('staffId').optional().isInt(),
    body('date').optional().isISO8601(),
    body('time').optional().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    try {
      const booking = await Booking.findByPk(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      req.resourceTenantId = booking.tenantId;
      requireTenantAccess(req, res, async () => {
        const { status, notes, staffId, date, time } = req.body;
        if (status !== undefined) booking.status = status;
        if (notes !== undefined) booking.notes = notes;
        if (staffId !== undefined) booking.staffId = staffId;
        if (date !== undefined) booking.date = date;
        if (time !== undefined) booking.time = time;
        await booking.save();
        res.json({ message: 'Booking updated', booking });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update booking', details: err.message });
    }
  }
);

// Admin/Manager: Delete a booking
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const booking = await Booking.findByPk(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      req.resourceTenantId = booking.tenantId;
      requireTenantAccess(req, res, async () => {
        await booking.destroy();
        res.json({ message: 'Booking deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete booking', details: err.message });
    }
  }
);

module.exports = router;
