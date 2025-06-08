'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add contact column to employees table
    await queryInterface.addColumn('employees', 'contact', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove contact column from employees table
    await queryInterface.removeColumn('employees', 'contact');
  }
};
