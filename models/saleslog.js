'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SalesLog extends Model {
    static associate(models) {
      // Optionally associate with Product, Tenant
      SalesLog.belongsTo(models.Product, { foreignKey: 'productId' });
      SalesLog.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    }
  }
  SalesLog.init(
    {
      tenantId: DataTypes.INTEGER,
      storeId: DataTypes.INTEGER,
      employeeId: DataTypes.INTEGER,
      productId: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
      totalPrice: DataTypes.FLOAT,
      soldAt: DataTypes.DATE,
      userId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'SalesLog',
      tableName: 'saleslogs',
    }
  );
  return SalesLog;
};
