const express = require('express');
const { body, validationResult } = require('express-validator');
const { Asset, RestockLog } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');

const router = express.Router();

// List all assets for a tenant
router.get('/', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    const assets = await Asset.findAll({ where: { tenantId } });
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets', details: err.message });
  }
});

// Create a new asset
router.post(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').notEmpty(),
    body('category').notEmpty(),
    body('quantity').isInt({ min: 0 }),
    body('unit').notEmpty(),
    body('minStock').isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const tenantId = req.user.tenantId;
    const { name, category, quantity, unit, minStock, notes } = req.body;
    try {
      const asset = await Asset.create({
        tenantId,
        name,
        category,
        quantity,
        unit,
        minStock,
        lastRestocked: new Date(),
        notes,
      });
      res.status(201).json({ message: 'Asset created', asset });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create asset', details: err.message });
    }
  }
);

// Update asset details
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').optional().notEmpty(),
    body('category').optional().notEmpty(),
    body('quantity').optional().isInt({ min: 0 }),
    body('unit').optional().notEmpty(),
    body('minStock').optional().isInt({ min: 0 }),
    body('notes').optional(),
  ],
  async (req, res) => {
    const { id } = req.params;
    try {
      const asset = await Asset.findByPk(id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      req.resourceTenantId = asset.tenantId;
      requireTenantAccess(req, res, async () => {
        Object.assign(asset, req.body);
        await asset.save();
        res.json({ message: 'Asset updated', asset });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update asset', details: err.message });
    }
  }
);

// Delete an asset
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['Admin']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const asset = await Asset.findByPk(id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      req.resourceTenantId = asset.tenantId;
      requireTenantAccess(req, res, async () => {
        await asset.destroy();
        res.json({ message: 'Asset deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete asset', details: err.message });
    }
  }
);

/**
 * Restock asset (increment quantity and update lastRestocked)
 * Also logs the restock in restocklogs
 */
router.post(
  '/:id/restock',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [body('amount').isInt({ min: 1 })],
  async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
      const asset = await Asset.findByPk(id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      req.resourceTenantId = asset.tenantId;
      requireTenantAccess(req, res, async () => {
        asset.quantity += amount;
        asset.lastRestocked = new Date();
        await asset.save();
        // Log the restock
        await RestockLog.create({
          assetId: asset.id,
          amount,
          restockedBy: req.user.id,
          createdAt: new Date(),
        });
        res.json({ message: 'Asset restocked', asset });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to restock asset', details: err.message });
    }
  }
);

/**
 * Get restock logs for an asset
 * GET /assets/:id/restock
 */
router.get(
  '/:id/restock',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const asset = await Asset.findByPk(id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      req.resourceTenantId = asset.tenantId;
      requireTenantAccess(req, res, async () => {
        const logs = await RestockLog.findAll({
          where: { assetId: id },
          order: [['createdAt', 'DESC']],
        });
        res.json({ logs });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch restock logs', details: err.message });
    }
  }
);

module.exports = router;
