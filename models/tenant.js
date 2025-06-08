'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      models.Tenant.belongsToMany(models.User, {
        through: 'CustomerTenants',
        foreignKey: 'tenantId',
        otherKey: 'userId',
        as: 'customers'
      });
    }
  }
  Tenant.init({
    name: DataTypes.STRING,
    subdomain: DataTypes.STRING,
    plan: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    features: DataTypes.JSON,
    planId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Tenant',
  });

  Tenant.associate = function(models) {
    Tenant.belongsTo(models.Plan, { foreignKey: 'planId', as: 'planInfo' });
  };
  return Tenant;
};
