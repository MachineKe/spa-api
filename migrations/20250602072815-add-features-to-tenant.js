'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Tenants');
    if (!table.features) {
      await queryInterface.addColumn('Tenants', 'features', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenants', 'features');
  }
};
