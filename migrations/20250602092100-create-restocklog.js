"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("restocklogs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      assetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: "assets", key: "id" },
        // onDelete: "CASCADE",
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      restockedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: "users", key: "id" },
        // onDelete: "SET NULL",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("restocklogs");
  },
};
