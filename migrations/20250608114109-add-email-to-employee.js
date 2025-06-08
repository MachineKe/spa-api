'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add email column to employees table
    await queryInterface.addColumn('employees', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove email column from employees table
    await queryInterface.removeColumn('employees', 'email');
  }
};
