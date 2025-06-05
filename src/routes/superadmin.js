const express = require('express');
const { Tenant, User } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');

const router = express.Router();

// List all tenants
router.get('/tenants', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const tenants = await Tenant.findAll();
    res.json({ tenants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenants', details: err.message });
  }
});

// Add a new tenant
router.post('/tenants', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  const { name, contactInfo, plan } = req.body;
  try {
    const tenant = await Tenant.create({ name, contactInfo, plan });
    res.status(201).json({ message: 'Tenant created', tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tenant', details: err.message });
  }
});

// Edit a tenant
router.put('/tenants/:id', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    Object.assign(tenant, req.body);
    await tenant.save();
    res.json({ message: 'Tenant updated', tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant', details: err.message });
  }
});

// List all plans
router.get('/plans', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const Plan = require('../../models').Plan;
    const plans = await Plan.findAll();
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans', details: err.message });
  }
});

// Create a new plan
router.post('/plans', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const Plan = require('../../models').Plan;
    const plan = await Plan.create(req.body);
    res.status(201).json({ message: 'Plan created', plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan', details: err.message });
  }
});

// Update a plan
router.put('/plans/:id', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const Plan = require('../../models').Plan;
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    Object.assign(plan, req.body);
    await plan.save();
    res.json({ message: 'Plan updated', plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan', details: err.message });
  }
});

// Delete a plan
router.delete('/plans/:id', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const Plan = require('../../models').Plan;
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    await plan.destroy();
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete plan', details: err.message });
  }
});

// Assign/change a tenant's plan
router.put('/tenants/:id/plan', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });
  try {
    const Tenant = require('../../models').Tenant;
    const Plan = require('../../models').Plan;
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const plan = await Plan.findByPk(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    tenant.planId = planId;
    await tenant.save();
    res.json({ message: 'Tenant plan updated', tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant plan', details: err.message });
  }
});

// Usage metrics (real)
router.get('/usage', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const { Tenant, User } = require('../../models');
    const Booking = require('../../models').Booking;
    const tenants = await Tenant.findAll();
    const usage = [];
    for (const tenant of tenants) {
      // Count users (no isActive column)
      const activeUsers = await User.count({ where: { tenantId: tenant.id } });
      // Sum sales from bookings
      let sales = 0;
      let bookingCount = 0;
      if (Booking) {
        const bookings = await Booking.findAll({ where: { tenantId: tenant.id } });
        bookingCount = bookings.length;
        sales = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
      }
      usage.push({
        tenant: tenant.name,
        activeUsers,
        sales,
        bookingCount,
      });
    }
    res.json({ usage });
  } catch (err) {
    console.error("Error in /superadmin/usage:", err);
    res.status(500).json({ error: 'Failed to fetch usage metrics', details: err.message });
  }
});

/**
 * Get feature toggles for a tenant
 * GET /api/superadmin/tenants/:id/features
 */
router.get('/tenants/:id/features', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await require('sequelize').models.Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ features: tenant.features || {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch features', details: err.message });
  }
});

/**
 * Update feature toggles for a tenant
 * PUT /api/superadmin/tenants/:id/features
 * Body: { features: { giftCards: true, promotions: false, ... } }
 */
router.put('/tenants/:id/features', authenticateJWT, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  const { features } = req.body;
  if (typeof features !== 'object' || features === null) {
    return res.status(400).json({ error: 'features object required' });
  }
  try {
    const Tenant = require('sequelize').models.Tenant;
    const tenant = await Tenant.findByPk(id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    tenant.features = features;
    await tenant.save();
    res.json({ message: 'Features updated', features: tenant.features });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update features', details: err.message });
  }
});

module.exports = router;
