const express = require('express');
const { body, validationResult } = require('express-validator');
const { ServiceRequest, Service } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Customer: Create a new service request
 * POST /api/servicerequest
 */
router.post(
  '/',
  authenticateJWT,
  requireRole(['Customer']),
  [
    body('serviceId').isInt(),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { serviceId, notes } = req.body;
    try {
      // Validate service exists
      const service = await Service.findByPk(serviceId);
      if (!service) return res.status(404).json({ error: 'Service not found' });

      const request = await ServiceRequest.create({
        userId: req.user.id,
        serviceId,
        tenantId: service.tenantId,
        notes,
        status: 'pending'
      });
      res.status(201).json({ message: 'Service request submitted', request });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit service request', details: err.message });
    }
  }
);

/**
 * Customer: List own service requests
 * GET /api/servicerequest/my
 */
router.get(
  '/my',
  authenticateJWT,
  requireRole(['Customer']),
  async (req, res) => {
    try {
      const { CustomerTenants } = require("../../models");
      // Get tenantIds for this user
      const links = await CustomerTenants.findAll({ where: { userId: req.user.id } });
      const tenantIds = links.map(l => l.tenantId);
      const requests = await ServiceRequest.findAll({
        where: {
          userId: req.user.id,
          tenantId: tenantIds.length > 0 ? tenantIds : undefined
        },
        include: [{ model: Service, attributes: ['name'] }]
      });
      res.json({ requests });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch service requests', details: err.message });
    }
  }
);

/**
 * Customer: Update own service request (e.g. cancel, add notes)
 * PUT /api/servicerequest/:id
 */
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Customer']),
  [
    body('status').optional().isIn(['pending', 'cancelled']),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    try {
      const request = await ServiceRequest.findOne({ where: { id, userId: req.user.id } });
      if (!request) return res.status(404).json({ error: 'Service request not found' });

      const { status, notes } = req.body;
      if (status) request.status = status;
      if (notes !== undefined) request.notes = notes;
      await request.save();

      res.json({ message: 'Service request updated', request });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update service request', details: err.message });
    }
  }
);

module.exports = router;
