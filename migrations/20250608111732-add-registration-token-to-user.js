'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add registrationToken column if it doesn't exist
    const table = await queryInterface.describeTable('Users');
    if (!table.registrationToken) {
      await queryInterface.addColumn('Users', 'registrationToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.registrationTokenExpires) {
      await queryInterface.addColumn('Users', 'registrationTokenExpires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'registrationToken');
    await queryInterface.removeColumn('Users', 'registrationTokenExpires');
  }
};
