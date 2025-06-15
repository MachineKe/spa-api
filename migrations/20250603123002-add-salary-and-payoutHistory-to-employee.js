'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');
    if (!table.salary) {
      await queryInterface.addColumn('employees', 'salary', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
    if (!table.payoutHistory) {
      await queryInterface.addColumn('employees', 'payoutHistory', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('employees', 'salary');
    await queryInterface.removeColumn('employees', 'payoutHistory');
  }
};
