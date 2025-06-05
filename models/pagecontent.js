'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PageContent extends Model {
    static associate(models) {
      // Optionally associate with Tenant
    }
  }
  PageContent.init(
    {
      tenantId: DataTypes.INTEGER,
      page: DataTypes.STRING, // e.g., 'home', 'about', 'services', etc.
      content: DataTypes.JSON, // Flexible: can be JSON or HTML string
      lastEditedBy: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'PageContent',
      indexes: [
        { fields: ['tenantId', 'page'], unique: true }
      ]
    }
  );
  return PageContent;
};
