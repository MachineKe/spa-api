'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('saleslogs', 'transactionId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('saleslogs', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('saleslogs', 'approverId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('saleslogs', 'commissionAmount', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('saleslogs', 'approvalNotes', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('saleslogs', 'transactionId');
    await queryInterface.removeColumn('saleslogs', 'status');
    await queryInterface.removeColumn('saleslogs', 'approverId');
    await queryInterface.removeColumn('saleslogs', 'commissionAmount');
    await queryInterface.removeColumn('saleslogs', 'approvalNotes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_saleslogs_status";');
  }
};
