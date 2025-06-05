const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { Gallery, Tenant } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');

const router = express.Router();

// Configure multer for file uploads (store in /uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Public: List all gallery images for a tenant (by subdomain or tenantId)
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
    const images = await Gallery.findAll({ where: { tenantId: tenant.id } });
    res.json({ images });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery', details: err.message });
  }
});

// Admin: Upload a new gallery image (tenant admin only)
router.post(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  upload.single('image'),
  [body('caption').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (!req.file) return res.status(400).json({ error: 'Image file required' });

    try {
      const imageUrl = `/uploads/${req.file.filename}`;
      const { caption } = req.body;
      const image = await Gallery.create({
        imageUrl,
        caption,
        tenantId: req.user.tenantId,
      });
      res.status(201).json({ message: 'Image uploaded', image });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
  }
);

// Admin: Delete a gallery image (tenant admin only)
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const image = await Gallery.findByPk(id);
      if (!image) return res.status(404).json({ error: 'Image not found' });
      req.resourceTenantId = image.tenantId;
      requireTenantAccess(req, res, async () => {
        await image.destroy();
        res.json({ message: 'Image deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete image', details: err.message });
    }
  }
);

module.exports = router;
