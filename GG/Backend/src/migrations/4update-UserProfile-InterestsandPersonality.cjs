'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the new zodiac column
    await queryInterface.addColumn('UserProfile', 'zodiac', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove the old hobby column
    await queryInterface.removeColumn('UserProfile', 'hobby');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new zodiac column
    await queryInterface.removeColumn('UserProfile', 'zodiac');

    // Add back the old hobby column
    await queryInterface.addColumn('UserProfile', 'hobby', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
