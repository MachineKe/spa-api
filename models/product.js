'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Optionally associate with Tenant
    }
  }
  Product.init(
    {
      tenantId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      category: DataTypes.STRING,
      price: DataTypes.FLOAT,
      sku: DataTypes.STRING,
      stock: DataTypes.INTEGER,
      description: DataTypes.TEXT,
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Product',
      indexes: [
        { fields: ['tenantId', 'name'] }
      ]
    }
  );
  return Product;
};
