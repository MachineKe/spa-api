module.exports = (sequelize, DataTypes) => {
  const RestockLog = sequelize.define(
    "RestockLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      assetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Assets", key: "id" },
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      restockedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "restocklogs",
      timestamps: false,
    }
  );

  RestockLog.associate = (models) => {
    RestockLog.belongsTo(models.Asset, { foreignKey: "assetId" });
    RestockLog.belongsTo(models.User, { foreignKey: "restockedBy" });
  };

  return RestockLog;
};
