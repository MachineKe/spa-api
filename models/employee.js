'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Employee.belongsTo(models.Tenant, { foreignKey: "tenantId" });
      Employee.belongsTo(models.Store, { foreignKey: "storeId" });
    }
  }
  // NOTE: Field-level encryption is temporarily disabled due to sequelize-encrypted incompatibility with Sequelize v6+.
  // To restore encryption, use a maintained package or implement encryption in model hooks.

  Employee.init(
    {
      name: DataTypes.STRING,
      role: DataTypes.STRING,
      bio: DataTypes.TEXT,
      photoUrl: DataTypes.STRING,
      tenantId: DataTypes.INTEGER,
      storeId: DataTypes.INTEGER,
      email: DataTypes.STRING,
      contact: DataTypes.STRING, // <-- Add this line
      // Sensitive fields (should be encrypted in production)
      salary: DataTypes.FLOAT,
      payoutHistory: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: 'Employee',
      tableName: 'employees',
    }
  );
  return Employee;
};
