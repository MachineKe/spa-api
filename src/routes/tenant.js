const express = require('express');
const { body, validationResult } = require('express-validator');
const { Tenant, User } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../utils/notify');

const router = express.Router();

// Create/register a new tenant (SuperAdmin only)
router.post(
  '/',
  authenticateJWT,
  requireRole('SuperAdmin'),
  [
    body('name').notEmpty(),
    body('subdomain').notEmpty(),
    body('plan').isIn(['monthly', 'commission']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, subdomain, plan } = req.body;
    try {
      const existing = await Tenant.findOne({ where: { subdomain } });
      if (existing) return res.status(409).json({ error: 'Subdomain already in use' });

      const tenant = await Tenant.create({
        name,
        subdomain,
        plan,
        isActive: true,
        features: [],
      });

      res.status(201).json({ message: 'Tenant created', tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create tenant', details: err.message });
    }
  }
);

// List all tenants (SuperAdmin only)
router.get(
  '/',
  authenticateJWT,
  requireRole('SuperAdmin'),
  async (_req, res) => {
    try {
      const tenants = await Tenant.findAll();
      res.json({ tenants });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tenants', details: err.message });
    }
  }
);

  // Update tenant details (SuperAdmin only)
router.put(
  '/:id',
  authenticateJWT,
  requireRole('SuperAdmin'),
  [
    body('name').optional().notEmpty(),
    body('plan').optional().isIn(['monthly', 'commission']),
    body('isActive').optional().isBoolean(),
    body('address').optional().isString(),
    body('phone').optional().isString(),
    body('email').optional().isEmail(),
    body('mapUrl').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    try {
      const tenant = await Tenant.findByPk(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const { name, plan, isActive, address, phone, email, mapUrl } = req.body;
      if (name !== undefined) tenant.name = name;
      if (plan !== undefined) tenant.plan = plan;
      if (isActive !== undefined) tenant.isActive = isActive;
      if (address !== undefined) tenant.address = address;
      if (phone !== undefined) tenant.phone = phone;
      if (email !== undefined) tenant.email = email;
      if (mapUrl !== undefined) tenant.mapUrl = mapUrl;

      await tenant.save();
      res.json({ message: 'Tenant updated', tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update tenant', details: err.message });
    }
  }
);

// Public: Get contact info for a tenant (by subdomain or tenantId)
router.get(
  '/public/contact',
  async (req, res) => {
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
      const { address, phone, email, mapUrl } = tenant;
      res.json({ address, phone, email, mapUrl });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch contact info', details: err.message });
    }
  }
);

// Deactivate (soft-delete) a tenant (SuperAdmin only)
router.delete(
  '/:id',
  authenticateJWT,
  requireRole('SuperAdmin'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const tenant = await Tenant.findByPk(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      tenant.isActive = false;
      await tenant.save();
      res.json({ message: 'Tenant deactivated', tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to deactivate tenant', details: err.message });
    }
  }
);

/**
 * Public: Register a new tenant and initial admin user
 * POST /api/tenant/register
 * Body: { name, subdomain, plan, adminUsername, adminEmail, adminPassword }
 */
router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('subdomain').notEmpty(),
    body('plan').isIn(['monthly', 'commission']),
    body('adminUsername').notEmpty(),
    body('adminEmail').isEmail(),
    body('adminPassword').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, subdomain, plan, adminUsername, adminEmail, adminPassword } = req.body;
    try {
      // Check subdomain uniqueness
      const existing = await Tenant.findOne({ where: { subdomain } });
      if (existing) return res.status(409).json({ error: 'Subdomain already in use' });

      // Create tenant
      const tenant = await Tenant.create({
        name,
        subdomain,
        plan,
        isActive: true,
        features: [],
      });

      // Create initial admin user for tenant
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash(adminPassword, 10);
      const adminUser = await User.create({
        username: adminUsername,
        email: adminEmail,
        password: hashed,
        role: 'Admin',
        tenantId: tenant.id,
      });

      // Send registration email to admin
      try {
        await sendEmail({
          to: adminEmail,
          subject: "Welcome to Fellas Spa & Barbershop Platform",
          html: `
            <h2>Welcome, ${adminUsername}!</h2>
            <p>Your business <b>${tenant.name}</b> has been registered successfully.</p>
            <p>You can now log in as the admin and start configuring your spa or barbershop platform.</p>
            <p><b>Subdomain:</b> ${tenant.subdomain}</p>
            <p>Thank you for choosing Fellas Spa & Barbershop!</p>
          `
        });
      } catch (emailErr) {
        // Log but do not fail registration if email fails
        console.error("Failed to send registration email:", emailErr);
      }

      res.status(201).json({
        message: 'Tenant and admin user created',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
        },
        adminUser: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
    } catch (err) {
      // Enhanced error logging for diagnostics
      const errorId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const safeBody = {
        name,
        subdomain,
        plan,
        adminUsername,
        adminEmail,
        // adminPassword intentionally omitted
      };
      console.error(`[${errorId}] Registration error:`, {
        error: err,
        stack: err?.stack,
        requestBody: safeBody,
      });
      res.status(500).json({
        error: 'Failed to register tenant',
        details: err.message,
        errorId,
      });
    }
  }
);

/**
 * Get current tenant info (for Admin/Manager)
 * GET /api/tenants/me
 */
router.get(
  '/me',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const tenant = await Tenant.findByPk(req.user.tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      res.json({ tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tenant info', details: err.message });
    }
  }
);

/**
 * Update current tenant info (for Admin/Manager)
 * PUT /api/tenants/me
 */
router.put(
  '/me',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').optional().notEmpty(),
    body('address').optional().isString(),
    body('phone').optional().isString(),
    body('email').optional().isEmail(),
    body('mapUrl').optional().isString(),
    body('features').optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const tenant = await Tenant.findByPk(req.user.tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const { name, address, phone, email, mapUrl, features } = req.body;
      if (name !== undefined) tenant.name = name;
      if (address !== undefined) tenant.address = address;
      if (phone !== undefined) tenant.phone = phone;
      if (email !== undefined) tenant.email = email;
      if (mapUrl !== undefined) tenant.mapUrl = mapUrl;
      if (features !== undefined) tenant.features = features;

      await tenant.save();
      res.json({ message: 'Tenant updated', tenant });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update tenant info', details: err.message });
    }
  }
);

module.exports = router;
