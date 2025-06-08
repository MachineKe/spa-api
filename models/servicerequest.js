'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ServiceRequest extends Model {
    static associate(models) {
      ServiceRequest.belongsTo(models.User, { foreignKey: 'userId' });
      ServiceRequest.belongsTo(models.Service, { foreignKey: 'serviceId' });
    }
  }
  ServiceRequest.init(
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      serviceId: { type: DataTypes.INTEGER, allowNull: false },
      tenantId: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
      notes: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      sequelize,
      modelName: 'ServiceRequest',
      tableName: 'ServiceRequests'
    }
  );
  return ServiceRequest;
};
