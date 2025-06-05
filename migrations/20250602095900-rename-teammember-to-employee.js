"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper to check if a table exists
    async function tableExists(tableName) {
      const tables = await queryInterface.showAllTables();
      return tables.includes(tableName) || tables.includes(tableName.toLowerCase());
    }

    // Helper to check if a column exists
    async function columnExists(table, column) {
      const desc = await queryInterface.describeTable(table);
      return !!desc[column];
    }

    // Rename table if it exists
    if (await tableExists("teammembers")) {
      await queryInterface.renameTable("teammembers", "employees");
    }

    // Attendance
    if (await tableExists("Attendances") && await columnExists("Attendances", "teammemberId")) {
      await queryInterface.renameColumn("Attendances", "teammemberId", "employeeId");
    }
    // LeaveRequest
    if (await tableExists("LeaveRequests") && await columnExists("LeaveRequests", "teammemberId")) {
      await queryInterface.renameColumn("LeaveRequests", "teammemberId", "employeeId");
    }
    // EmployeeDocument
    if (await tableExists("EmployeeDocuments") && await columnExists("EmployeeDocuments", "teammemberId")) {
      await queryInterface.renameColumn("EmployeeDocuments", "teammemberId", "employeeId");
    }
    // Payout (if exists)
    if (await tableExists("Payouts") && await columnExists("Payouts", "teammemberId")) {
      await queryInterface.renameColumn("Payouts", "teammemberId", "employeeId");
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Helper to check if a table exists
    async function tableExists(tableName) {
      const tables = await queryInterface.showAllTables();
      return tables.includes(tableName) || tables.includes(tableName.toLowerCase());
    }

    // Helper to check if a column exists
    async function columnExists(table, column) {
      const desc = await queryInterface.describeTable(table);
      return !!desc[column];
    }

    // Revert table name
    if (await tableExists("employees")) {
      await queryInterface.renameTable("employees", "teammembers");
    }

    // Attendance
    if (await tableExists("Attendances") && await columnExists("Attendances", "employeeId")) {
      await queryInterface.renameColumn("Attendances", "employeeId", "teammemberId");
    }
    // LeaveRequest
    if (await tableExists("LeaveRequests") && await columnExists("LeaveRequests", "employeeId")) {
      await queryInterface.renameColumn("LeaveRequests", "employeeId", "teammemberId");
    }
    // EmployeeDocument
    if (await tableExists("EmployeeDocuments") && await columnExists("EmployeeDocuments", "employeeId")) {
      await queryInterface.renameColumn("EmployeeDocuments", "employeeId", "teammemberId");
    }
    // Payout (if exists)
    if (await tableExists("Payouts") && await columnExists("Payouts", "employeeId")) {
      await queryInterface.renameColumn("Payouts", "employeeId", "teammemberId");
    }
  },
};
