/**
 * Middleware to enforce tenant data isolation.
 * - SuperAdmin can access all data.
 * - Other users can only access data for their own tenant.
 * 
 * Usage: Attach to routes that require tenant isolation.
 * Expects req.user.tenantId to be set by JWT middleware.
 */

function requireTenantAccess(req, res, next) {
  // SuperAdmin can access all tenants
  if (req.user && req.user.role === 'SuperAdmin') {
    return next();
  }
  // For other roles, tenantId must match the resource's tenantId
  // Assumes req.resourceTenantId is set by the route/controller
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Tenant access required' });
  }
  if (req.resourceTenantId && req.user.tenantId !== req.resourceTenantId) {
    return res.status(403).json({ error: 'Forbidden: cross-tenant access denied' });
  }
  next();
}

module.exports = {
  requireTenantAccess,
};
