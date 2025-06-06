const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Tenant } = require('../../models');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { authenticateJWT } = require('../middleware/auth');
const { recordAuditLog } = require('../utils/audit');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register a new user (Admin, Manager, Staff, SuperAdmin)
router.post(
  '/register',
  [
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['Admin', 'Manager', 'Staff', 'SuperAdmin']),
    body('tenantId').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, role, tenantId } = req.body;

    try {
      // Check if user exists
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      // If not SuperAdmin, tenantId is required
      if (role !== 'SuperAdmin' && !tenantId)
        return res.status(400).json({ error: 'tenantId required for non-SuperAdmin' });

      // If tenantId provided, check if tenant exists
      if (tenantId) {
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        email,
        password: hashed,
        role,
        tenantId: role === 'SuperAdmin' ? null : tenantId,
      });

      res.status(201).json({ message: 'User registered', user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed', details: err.message });
    }
  }
);

// Login (with 2FA support)
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty(), body('twoFactorToken').optional()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, twoFactorToken } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        await recordAuditLog({
          action: 'login_failed',
          userId: null,
          tenantId: null,
          targetType: 'User',
          targetId: null,
          details: { email, reason: 'User not found' },
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        await recordAuditLog({
          action: 'login_failed',
          userId: user.id,
          tenantId: user.tenantId,
          targetType: 'User',
          targetId: user.id,
          details: { email, reason: 'Password mismatch' },
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // If 2FA is enabled, require token
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          await recordAuditLog({
            action: 'login_failed',
            userId: user.id,
            tenantId: user.tenantId,
            targetType: 'User',
            targetId: user.id,
            details: { email, reason: '2FA required' },
            ip: req.ip,
          });
          return res.status(401).json({ error: '2FA token required' });
        }
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorToken,
        });
        if (!verified) {
          await recordAuditLog({
            action: 'login_failed',
            userId: user.id,
            tenantId: user.tenantId,
            targetType: 'User',
            targetId: user.id,
            details: { email, reason: 'Invalid 2FA token' },
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Invalid 2FA token' });
        }
      }

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

      await recordAuditLog({
        action: 'login_success',
        userId: user.id,
        tenantId: user.tenantId,
        targetType: 'User',
        targetId: user.id,
        details: { email },
        ip: req.ip,
      });

      res.json({ token, user: payload });
    } catch (err) {
      res.status(500).json({ error: 'Login failed', details: err.message });
    }
  }
);

// Enable 2FA (for Admins and SuperAdmin)
router.post('/enable-2fa', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!['Admin', 'SuperAdmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only Admins and SuperAdmin can enable 2FA' });
    }
    // Generate secret
    const secret = speakeasy.generateSecret({ name: `FellasSpa (${user.email})` });
    // Save secret to user (do not enable yet)
    user.twoFactorSecret = secret.base32;
    await user.save();
    // Generate QR code
    const qr = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ otpauth_url: secret.otpauth_url, qr });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable 2FA', details: err.message });
  }
});

// Verify 2FA setup (activate 2FA)
router.post('/verify-2fa', authenticateJWT, [body('token').notEmpty()], async (req, res) => {
  const { token } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.twoFactorSecret) return res.status(400).json({ error: '2FA not initialized' });
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });
    if (!verified) return res.status(401).json({ error: 'Invalid 2FA token' });
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ message: '2FA enabled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify 2FA', details: err.message });
  }
});

// Get current user info (protected)
router.get('/me', authenticateJWT, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
