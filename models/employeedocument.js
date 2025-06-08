module.exports = (sequelize, DataTypes) => {
  const EmployeeDocument = sequelize.define('EmployeeDocument', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  return EmployeeDocument;
};
