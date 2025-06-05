'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Plan.hasMany(models.Tenant, { foreignKey: 'planId', as: 'tenants' });
    }
  }
  Plan.init({
    name: DataTypes.STRING,
    price: DataTypes.FLOAT,
    billing: DataTypes.STRING,
    description: DataTypes.TEXT,
    features: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Plan',
  });
  return Plan;
};
