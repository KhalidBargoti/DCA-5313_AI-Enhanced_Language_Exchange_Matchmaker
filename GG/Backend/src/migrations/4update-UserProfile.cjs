// 'use strict';

// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     // Add the new default_time_zone column
//     await queryInterface.addColumn('UserProfile', 'default_time_zone', {
//       type: Sequelize.STRING,
//       allowNull: false,
//       defaultValue: 'UTC'
//     });

//     // Remove the old availability columns
//     await queryInterface.removeColumn('UserProfile', 'dates_available');
//     await queryInterface.removeColumn('UserProfile', 'times_available');
//   },

//   down: async (queryInterface, Sequelize) => {
//     // Remove the new default_time_zone column
//     await queryInterface.removeColumn('UserProfile', 'default_time_zone');

//     // Add back the old availability columns
//     await queryInterface.addColumn('UserProfile', 'dates_available', {
//       type: Sequelize.STRING,
//       allowNull: true
//     });
//     await queryInterface.addColumn('UserProfile', 'times_available', {
//       type: Sequelize.STRING,
//       allowNull: true
//     });
//   }
// };
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'UserProfiles'; // <-- change if your table is named differently

    const desc = await queryInterface.describeTable(tableName);

    // Add default_time_zone only if it's missing
    if (!desc.default_time_zone) {
      await queryInterface.addColumn(tableName, 'default_time_zone', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: 'UTC'
      });
    }

    // If this migration also added other columns in your repo,
    // guard each one the same way:
    //
    // if (!desc.some_other_column) {
    //   await queryInterface.addColumn(tableName, 'some_other_column', { ... });
    // }
  },

  async down(queryInterface /*, Sequelize */) {
    const tableName = 'UserProfiles';
    const desc = await queryInterface.describeTable(tableName);

    if (desc.default_time_zone) {
      await queryInterface.removeColumn(tableName, 'default_time_zone');
    }

    // Mirror other guarded columns here if needed, e.g.:
    // if (desc.some_other_column) {
    //   await queryInterface.removeColumn(tableName, 'some_other_column');
    // }
  }
};
