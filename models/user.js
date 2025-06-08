'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      models.User.belongsToMany(models.Tenant, {
        through: 'CustomerTenants',
        foreignKey: 'userId',
        otherKey: 'tenantId',
        as: 'tenants'
      });
    }
  }
  User.init({
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING,
    twoFactorSecret: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    registrationToken: DataTypes.STRING,
    registrationTokenExpires: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
