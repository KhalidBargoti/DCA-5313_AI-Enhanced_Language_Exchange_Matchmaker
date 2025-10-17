'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Friendship', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id_1: { type: Sequelize.INTEGER, allowNull: false },
      user_id_2: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('accepted', 'pending', 'blocked'),
        allowNull: false,
        defaultValue: 'accepted'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // prevent duplicates like (1,2) & (2,1) — we’ll enforce ordering in code
    await queryInterface.addIndex('Friendship', ['user_id_1', 'user_id_2'], {
      unique: true,
      name: 'uniq_friend_pair'
    });
    await queryInterface.addIndex('Friendship', ['user_id_1']);
    await queryInterface.addIndex('Friendship', ['user_id_2']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Friendship');
  }
};