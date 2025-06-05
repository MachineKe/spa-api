'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PageContents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      tenantId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      page: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      content: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      lastEditedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('PageContents', ['tenantId', 'page'], {
      unique: true,
      name: 'pagecontent_tenant_page_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('PageContents', 'pagecontent_tenant_page_unique');
    await queryInterface.dropTable('PageContents');
  }
};
