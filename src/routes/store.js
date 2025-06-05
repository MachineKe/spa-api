const express = require("express");
const { Store } = require("../../models");
const { authenticateJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all stores for the current tenant
router.get(
  "/",
  authenticateJWT,
  requireRole(["Admin", "Manager", "Staff"]),
  async (req, res) => {
    try {
      const stores = await Store.findAll({
        where: { tenantId: req.user.tenantId },
        order: [["name", "ASC"]],
      });
      res.json({ stores });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stores", details: err.message });
    }
  }
);

/**
 * Create a new store
 */
router.post(
  "/",
  authenticateJWT,
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const { name, location, notes } = req.body;
      const store = await Store.create({
        tenantId: req.user.tenantId,
        name,
        location,
        notes,
      });
      res.status(201).json({ message: "Store created", store });
    } catch (err) {
      res.status(500).json({ error: "Failed to create store", details: err.message });
    }
  }
);

/**
 * Update a store
 */
router.put(
  "/:id",
  authenticateJWT,
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const store = await Store.findByPk(id);
      if (!store || store.tenantId !== req.user.tenantId) {
        return res.status(404).json({ error: "Store not found" });
      }
      const { name, location, notes } = req.body;
      store.name = name ?? store.name;
      store.location = location ?? store.location;
      store.notes = notes ?? store.notes;
      await store.save();
      res.json({ message: "Store updated", store });
    } catch (err) {
      res.status(500).json({ error: "Failed to update store", details: err.message });
    }
  }
);

/**
 * Delete a store
 */
router.delete(
  "/:id",
  authenticateJWT,
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const store = await Store.findByPk(id);
      if (!store || store.tenantId !== req.user.tenantId) {
        return res.status(404).json({ error: "Store not found" });
      }
      await store.destroy();
      res.json({ message: "Store deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete store", details: err.message });
    }
  }
);

module.exports = router;
