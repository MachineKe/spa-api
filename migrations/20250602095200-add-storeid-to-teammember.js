"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("teammembers");
    if (!table.storeId) {
      await queryInterface.addColumn("teammembers", "storeId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Stores", key: "id" },
        onDelete: "SET NULL",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teammembers", "storeId");
  },
};
