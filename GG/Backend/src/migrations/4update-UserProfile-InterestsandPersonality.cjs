// 'use strict';

// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     // Add the new zodiac column
//     await queryInterface.addColumn('UserProfile', 'zodiac', {
//       type: Sequelize.STRING,
//       allowNull: true
//     });

//     // Remove the old hobby column
//     await queryInterface.removeColumn('UserProfile', 'hobby');
//   },

//   down: async (queryInterface, Sequelize) => {
//     // Remove the new zodiac column
//     await queryInterface.removeColumn('UserProfile', 'zodiac');

//     // Add back the old hobby column
//     await queryInterface.addColumn('UserProfile', 'hobby', {
//       type: Sequelize.STRING,
//       allowNull: true
//     });
//   }
// };
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'UserProfiles'; // <-- change to your real table if different
    const toAdd = {
      zodiac:       { type: Sequelize.STRING, allowNull: true },
      interests:    { type: Sequelize.TEXT,   allowNull: true },
      personality:  { type: Sequelize.STRING, allowNull: true },
      hobbies:      { type: Sequelize.TEXT,   allowNull: true },
      // add/remove fields to match this migration’s intent
    };

    // describeTable lets us skip columns that already exist
    const desc = await queryInterface.describeTable(tableName);

    for (const [col, def] of Object.entries(toAdd)) {
      if (!desc[col]) {
        await queryInterface.addColumn(tableName, col, def);
      }
    }
  },

  async down(queryInterface /*, Sequelize */) {
    const tableName = 'UserProfiles';
    const cols = ['zodiac', 'interests', 'personality', 'hobbies'];

    const desc = await queryInterface.describeTable(tableName);
    for (const col of cols) {
      if (desc[col]) {
        await queryInterface.removeColumn(tableName, col);
      }
    }
  }
};
