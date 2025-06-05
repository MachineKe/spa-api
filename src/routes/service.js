const express = require('express');
const { body, validationResult } = require('express-validator');
const { Service, Tenant } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');

const router = express.Router();

// Public: List all services for a tenant (by subdomain or tenantId)
router.get('/public', async (req, res) => {
  const { subdomain, tenantId } = req.query;
  try {
    let tenant;
    if (subdomain) {
      tenant = await Tenant.findOne({ where: { subdomain, isActive: true } });
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    } else if (tenantId) {
      tenant = await Tenant.findByPk(tenantId);
      if (!tenant || !tenant.isActive) return res.status(404).json({ error: 'Tenant not found' });
    } else {
      return res.status(400).json({ error: 'subdomain or tenantId required' });
    }
    const services = await Service.findAll({ where: { tenantId: tenant.id } });
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
});

// Admin: CRUD for services (tenant admin only)
router.post(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').notEmpty(),
    body('category').notEmpty(),
    body('description').notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('duration').isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, description, price, duration } = req.body;
    try {
      const service = await Service.create({
        name,
        category,
        description,
        price,
        duration,
        tenantId: req.user.tenantId,
      });
      res.status(201).json({ message: 'Service created', service });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create service', details: err.message });
    }
  }
);

router.get(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager', 'Staff']),
  async (req, res) => {
    try {
      const services = await Service.findAll({ where: { tenantId: req.user.tenantId } });
      res.json({ services });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch services', details: err.message });
    }
  }
);

router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').optional().notEmpty(),
    body('category').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    try {
      const service = await Service.findByPk(id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      req.resourceTenantId = service.tenantId;
      requireTenantAccess(req, res, async () => {
        const { name, category, description, price, duration } = req.body;
        if (name !== undefined) service.name = name;
        if (category !== undefined) service.category = category;
        if (description !== undefined) service.description = description;
        if (price !== undefined) service.price = price;
        if (duration !== undefined) service.duration = duration;
        await service.save();
        res.json({ message: 'Service updated', service });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update service', details: err.message });
    }
  }
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const service = await Service.findByPk(id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      req.resourceTenantId = service.tenantId;
      requireTenantAccess(req, res, async () => {
        await service.destroy();
        res.json({ message: 'Service deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete service', details: err.message });
    }
  }
);

module.exports = router;
