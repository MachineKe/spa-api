const express = require('express');
const { body, validationResult } = require('express-validator');
const { Product } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');
const { recordAuditLog } = require('../utils/audit');

const router = express.Router();

// List all products for a tenant
router.get('/', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    const products = await Product.findAll({ where: { tenantId } });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// Create a new product
router.post(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').notEmpty(),
    body('category').notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('sku').notEmpty(),
    body('stock').isInt({ min: 0 }),
    body('description').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const tenantId = req.user.tenantId;
    const { name, category, price, sku, stock, description } = req.body;
    try {
      const product = await Product.create({
        tenantId,
        name,
        category,
        price,
        sku,
        stock,
        description,
        isActive: true,
      });

      await recordAuditLog({
        action: 'product_created',
        userId: req.user.id,
        tenantId,
        targetType: 'Product',
        targetId: product.id,
        details: { name, category, price, sku, stock },
        ip: req.ip,
      });

      res.status(201).json({ message: 'Product created', product });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create product', details: err.message });
    }
  }
);

// Update product details
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [
    body('name').optional().notEmpty(),
    body('category').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('sku').optional().notEmpty(),
    body('stock').optional().isInt({ min: 0 }),
    body('description').optional(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    const { id } = req.params;
    try {
      const product = await Product.findByPk(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      req.resourceTenantId = product.tenantId;
      requireTenantAccess(req, res, async () => {
        Object.assign(product, req.body);
        await product.save();
        res.json({ message: 'Product updated', product });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update product', details: err.message });
    }
  }
);

// Delete a product
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['Admin']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const product = await Product.findByPk(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      req.resourceTenantId = product.tenantId;
      requireTenantAccess(req, res, async () => {
        await product.destroy();
        res.json({ message: 'Product deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete product', details: err.message });
    }
  }
);

/**
 * GET /api/products/top-selling
 * Returns the top-selling products for the current tenant.
 */
router.get('/top-selling', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  const { SalesLog, Product } = require('../../models');
  const tenantId = req.user.tenantId;
  try {
    // Aggregate sales by productId for this tenant
    const sales = await SalesLog.findAll({
      where: { tenantId },
      attributes: [
        'productId',
        [require('sequelize').fn('SUM', require('sequelize').col('quantity')), 'totalSold']
      ],
      group: ['productId'],
      order: [[require('sequelize').fn('SUM', require('sequelize').col('quantity')), 'DESC']],
      limit: 10,
      raw: true,
    });

    // Fetch product details for the top-selling products
    const productIds = sales.map(s => s.productId);
    const products = await Product.findAll({
      where: { id: productIds },
      raw: true,
    });

    // Merge sales data with product info
    const result = products.map(product => {
      const sale = sales.find(s => s.productId === product.id);
      const sold = sale ? Number(sale.totalSold) : 0;
      const revenue = sold * (product.price || 0);
      return {
        ...product,
        sold,
        revenue,
      };
    });

    res.json({ products: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top-selling products', details: err.message });
  }
});

module.exports = router;
