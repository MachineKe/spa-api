"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove old foreign key constraint if it exists
    // The constraint name may be 'teammembers_storeId_foreign_idx' or similar
    // Try to remove it safely (MySQL syntax)
    try {
      await queryInterface.removeConstraint("employees", "teammembers_storeId_foreign_idx");
    } catch (e) {
      // Constraint may not exist, ignore error
    }

    // Ensure storeId column exists on employees
    const table = await queryInterface.describeTable("employees");
    if (!table.storeId) {
      await queryInterface.addColumn("employees", "storeId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Stores", key: "id" },
        onDelete: "SET NULL",
      });
    } else {
      // Remove any existing foreign key on storeId (if not correct)
      try {
        await queryInterface.removeConstraint("employees", "employees_storeId_foreign_idx");
      } catch (e) {}
      // Add correct foreign key constraint
      await queryInterface.addConstraint("employees", {
        fields: ["storeId"],
        type: "foreign key",
        name: "employees_storeId_foreign_idx",
        references: {
          table: "Stores",
          field: "id",
        },
        onDelete: "SET NULL",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new constraint
    try {
      await queryInterface.removeConstraint("employees", "employees_storeId_foreign_idx");
    } catch (e) {}
    // Optionally, you could drop the column, but we will leave it for safety
  },
};
