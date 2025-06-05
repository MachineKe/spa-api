'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('employees', 'salary', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('employees', 'payoutHistory', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('employees', 'salary');
    await queryInterface.removeColumn('employees', 'payoutHistory');
  }
};
