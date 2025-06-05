const express = require("express");
const { authenticateJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /payment/charge
 * Initiate a payment (stub for Stripe/M-Pesa integration)
 * Body: { amount, currency, method, customer }
 */
router.post(
  "/charge",
  authenticateJWT,
  requireRole(["Admin", "Manager"]),
  async (req, res) => {
    const { amount, currency, method, customer } = req.body;
    // TODO: Integrate with Stripe, M-Pesa, or other payment API
    // For now, simulate a successful payment
    if (!amount || !currency || !method || !customer) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // Simulate payment processing
    setTimeout(() => {
      res.json({
        status: "success",
        message: `Payment of ${amount} ${currency} via ${method} for ${customer} processed (stub).`,
        transactionId: "demo-tx-" + Date.now(),
      });
    }, 1000);
  }
);

module.exports = router;
