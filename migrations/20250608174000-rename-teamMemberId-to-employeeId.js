'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename teamMemberId to employeeId in EmployeeDocuments, Attendances, and LeaveRequests
    // Only run if the old column exists
    const tableColumnExists = async (table, column) => {
      const [results] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
      );
      return results.length > 0;
    };

    // EmployeeDocuments
    if (await tableColumnExists('EmployeeDocuments', 'teamMemberId')) {
      await queryInterface.renameColumn('EmployeeDocuments', 'teamMemberId', 'employeeId');
    }
    // Attendances
    if (await tableColumnExists('Attendances', 'teamMemberId')) {
      await queryInterface.renameColumn('Attendances', 'teamMemberId', 'employeeId');
    }
    // LeaveRequests
    if (await tableColumnExists('LeaveRequests', 'teamMemberId')) {
      await queryInterface.renameColumn('LeaveRequests', 'teamMemberId', 'employeeId');
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert employeeId back to teamMemberId
    const tableColumnExists = async (table, column) => {
      const [results] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
      );
      return results.length > 0;
    };

    if (await tableColumnExists('EmployeeDocuments', 'employeeId')) {
      await queryInterface.renameColumn('EmployeeDocuments', 'employeeId', 'teamMemberId');
    }
    if (await tableColumnExists('Attendances', 'employeeId')) {
      await queryInterface.renameColumn('Attendances', 'employeeId', 'teamMemberId');
    }
    if (await tableColumnExists('LeaveRequests', 'employeeId')) {
      await queryInterface.renameColumn('LeaveRequests', 'employeeId', 'teamMemberId');
    }
  }
};
