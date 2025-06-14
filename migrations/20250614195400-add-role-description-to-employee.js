'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Employees', 'roleDescription', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Description of the employee role, e.g. Barber, Receptionist'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Employees', 'roleDescription');
  }
};
