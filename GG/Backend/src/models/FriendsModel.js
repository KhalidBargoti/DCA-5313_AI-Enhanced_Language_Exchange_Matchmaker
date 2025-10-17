'use strict';
module.exports = (sequelize, DataTypes) => {
  const Friendship = sequelize.define('Friendship', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id_1: { type: DataTypes.INTEGER, allowNull: false },
    user_id_2: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('accepted', 'pending', 'blocked'),
      allowNull: false,
      defaultValue: 'accepted'
    }
  }, {
    tableName: 'Friendship',
    underscored: true,              // created_at / updated_at
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true
  });

  Friendship.associate = (models) => {
    // Optionally wire to UserProfile if you want FKs
    // Friendship.belongsTo(models.UserProfile, { foreignKey: 'user_id_1' });
    // Friendship.belongsTo(models.UserProfile, { foreignKey: 'user_id_2' });
  };

  return Friendship;
};