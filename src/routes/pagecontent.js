const express = require('express');
const { body, validationResult } = require('express-validator');
const { PageContent } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');

const router = express.Router();

// Get page content for a tenant (admin or public)
router.get('/:page', authenticateJWT, requireRole(['Admin', 'Manager']), async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page } = req.params;
  try {
    const content = await PageContent.findOne({ where: { tenantId, page } });
    if (!content) return res.status(404).json({ error: 'Page content not found' });
    req.resourceTenantId = content.tenantId;
    requireTenantAccess(req, res, () => {
      res.json({ content });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch page content', details: err.message });
  }
});

// Create or update page content for a tenant
router.post(
  '/:page',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  [body('content').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const tenantId = req.user.tenantId;
    const { page } = req.params;
    const { content } = req.body;
    try {
      let pageContent = await PageContent.findOne({ where: { tenantId, page } });
      if (pageContent) {
        pageContent.content = content;
        pageContent.lastEditedBy = req.user.id;
        await pageContent.save();
        res.json({ message: 'Page content updated', content: pageContent });
      } else {
        pageContent = await PageContent.create({
          tenantId,
          page,
          content,
          lastEditedBy: req.user.id,
        });
        res.status(201).json({ message: 'Page content created', content: pageContent });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to save page content', details: err.message });
    }
  }
);

// Delete page content for a tenant
router.delete(
  '/:page',
  authenticateJWT,
  requireRole(['Admin']),
  async (req, res) => {
    const tenantId = req.user.tenantId;
    const { page } = req.params;
    try {
      const pageContent = await PageContent.findOne({ where: { tenantId, page } });
      if (!pageContent) return res.status(404).json({ error: 'Page content not found' });
      req.resourceTenantId = pageContent.tenantId;
      requireTenantAccess(req, res, async () => {
        await pageContent.destroy();
        res.json({ message: 'Page content deleted' });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete page content', details: err.message });
    }
  }
);

module.exports = router;
