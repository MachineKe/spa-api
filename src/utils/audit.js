const { AuditLog } = require('../../models');

/**
 * Record an audit log event.
 * @param {Object} params
 * @param {string} params.action - Action performed (e.g., 'update_salary')
 * @param {number} params.userId - ID of the user performing the action
 * @param {number} params.tenantId - Tenant context
 * @param {string} params.targetType - Type of resource (e.g., 'TeamMember')
 * @param {number} params.targetId - ID of the resource
 * @param {Object} params.details - Additional details (diff, old/new values, etc.)
 * @param {string} params.ip - IP address (optional)
 */
async function recordAuditLog({ action, userId, tenantId, targetType, targetId, details, ip }) {
  try {
    await AuditLog.create({
      action,
      userId,
      tenantId,
      targetType,
      targetId,
      details,
      ip,
    });
  } catch (err) {
    // Optionally log to stderr or external service
    console.error('Failed to record audit log:', err);
  }
}

module.exports = { recordAuditLog };
