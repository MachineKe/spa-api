'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      // Optionally associate with User, TeamMember, Tenant, etc.
    }
  }
  AuditLog.init(
    {
      action: DataTypes.STRING,
      userId: DataTypes.INTEGER,
      tenantId: DataTypes.INTEGER,
      targetType: DataTypes.STRING,
      targetId: DataTypes.INTEGER,
      details: DataTypes.JSON,
      ip: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'AuditLog',
    }
  );
  return AuditLog;
};
