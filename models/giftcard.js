'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GiftCard extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GiftCard.init({
    code: DataTypes.STRING,
    amount: DataTypes.FLOAT,
    recipientEmail: DataTypes.STRING,
    senderName: DataTypes.STRING,
    message: DataTypes.STRING,
    redeemed: DataTypes.BOOLEAN,
    tenantId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'GiftCard',
  });
  return GiftCard;
};