'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payout extends Model {
    static associate(models) {
      Payout.belongsTo(models.Employee, { foreignKey: 'employeeId' });
      Payout.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    }
  }
  Payout.init(
    {
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Payout',
      tableName: 'payouts',
    }
  );
  return Payout;
};
