'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    static associate(models) {
      // Optionally associate with Tenant
    }
  }
  Asset.init(
    {
      tenantId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      category: DataTypes.STRING,
      quantity: DataTypes.INTEGER,
      unit: DataTypes.STRING,
      minStock: DataTypes.INTEGER,
      lastRestocked: DataTypes.DATE,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Asset',
      tableName: 'assets',
      indexes: [
        { fields: ['tenantId', 'name'] }
      ]
    }
  );
  return Asset;
};
