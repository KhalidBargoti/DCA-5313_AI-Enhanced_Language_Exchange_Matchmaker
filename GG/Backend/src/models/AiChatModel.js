import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class AIChatModel extends Model {
    static associate(models) {
      // user can have many AI chat sessions
      AIChatModel.belongsTo(models.UserAccount, {
        foreignKey: "user_id",
        onDelete: "CASCADE"
      });
    }
  }

  AIChatModel.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      conversation: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AIChatModel",
      tableName: "AIChats",
      timestamps: true,
    }
  );

  return AIChatModel;
};