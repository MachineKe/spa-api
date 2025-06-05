'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GiftCards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.FLOAT
      },
      recipientEmail: {
        type: Sequelize.STRING
      },
      senderName: {
        type: Sequelize.STRING
      },
      message: {
        type: Sequelize.STRING
      },
      redeemed: {
        type: Sequelize.BOOLEAN
      },
      tenantId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GiftCards');
  }
};