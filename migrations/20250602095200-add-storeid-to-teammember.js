"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teammembers", "storeId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Stores", key: "id" },
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teammembers", "storeId");
  },
};
