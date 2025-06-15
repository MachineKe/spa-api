'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Tenants');
    if (!table.address) {
      await queryInterface.addColumn('Tenants', 'address', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.phone) {
      await queryInterface.addColumn('Tenants', 'phone', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.email) {
      await queryInterface.addColumn('Tenants', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.mapUrl) {
      await queryInterface.addColumn('Tenants', 'mapUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenants', 'address');
    await queryInterface.removeColumn('Tenants', 'phone');
    await queryInterface.removeColumn('Tenants', 'email');
    await queryInterface.removeColumn('Tenants', 'mapUrl');
  }
};
