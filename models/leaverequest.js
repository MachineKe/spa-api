module.exports = (sequelize, DataTypes) => {
  const LeaveRequest = sequelize.define('LeaveRequest', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('annual', 'sick', 'unpaid', 'other'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    response: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });

  return LeaveRequest;
};
