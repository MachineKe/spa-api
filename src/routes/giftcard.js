const express = require('express');
const { body, validationResult } = require('express-validator');
const { GiftCard, Tenant } = require('../../models');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/tenant');
const crypto = require('crypto');
const { sendEmail } = require("../utils/notify");
const { renderEmail } = require("../utils/emailTemplates");

const router = express.Router();

// Public: List all gift cards/promotions for a tenant (by subdomain or tenantId)
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
    const giftCards = await GiftCard.findAll({ where: { tenantId: tenant.id, redeemed: false } });
    res.json({ giftCards });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gift cards', details: err.message });
  }
});

// Public: Purchase/send a gift card
router.post(
  '/public',
  [
    body('amount').isFloat({ min: 1 }),
    body('recipientEmail').isEmail(),
    body('senderName').notEmpty(),
    body('message').optional().isString(),
    body('tenantId').isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, recipientEmail, senderName, message, tenantId } = req.body;
    try {
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant || !tenant.isActive) return res.status(404).json({ error: 'Tenant not found' });

      // Generate unique code
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();

      const giftCard = await GiftCard.create({
        code,
        amount,
        recipientEmail,
        senderName,
        message,
        redeemed: false,
        tenantId,
      });

      // Send branded email to recipient (non-blocking)
      sendEmail({
        to: recipientEmail,
        subject: `You've received a Fellas Spa Gift Card!`,
        html: renderEmail({
          title: "You've received a Gift Card!",
          body: `
            <p>Hi there,</p>
            <p><b>${senderName}</b> has sent you a <b>Ksh ${amount}</b> gift card for <b>${tenant.name}</b>.</p>
            <p>Your gift card code: <b style="font-size:1.3em;letter-spacing:2px;">${code}</b></p>
            ${message ? `<p>Message: <i>${message}</i></p>` : ""}
            <p>Present this code at the spa to redeem your gift.</p>
          `,
          cta: { label: "Book Now", url: tenant.mapUrl || "https://fellasspa.com/booking" },
        }),
      }).catch(() => {});

      res.status(201).json({ message: 'Gift card created', giftCard });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create gift card', details: err.message });
    }
  }
);

// Admin: List all gift cards for tenant
router.get(
  '/',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    try {
      const giftCards = await GiftCard.findAll({ where: { tenantId: req.user.tenantId } });
      res.json({ giftCards });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch gift cards', details: err.message });
    }
  }
);

// Admin: Mark gift card as redeemed
router.put(
  '/:id/redeem',
  authenticateJWT,
  requireRole(['Admin', 'Manager']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const giftCard = await GiftCard.findByPk(id);
      if (!giftCard) return res.status(404).json({ error: 'Gift card not found' });
      req.resourceTenantId = giftCard.tenantId;
      requireTenantAccess(req, res, async () => {
        giftCard.redeemed = true;
        await giftCard.save();
        res.json({ message: 'Gift card redeemed', giftCard });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to redeem gift card', details: err.message });
    }
  }
);

module.exports = router;
