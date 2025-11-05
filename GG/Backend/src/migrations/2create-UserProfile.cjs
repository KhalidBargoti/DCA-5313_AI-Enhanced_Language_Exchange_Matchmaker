// 'use strict';

// const { type } = require("os");
// const { sequelize } = require("../models");

// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     await queryInterface.createTable('UserProfile', {
//       id: {
//         allowNull: false,
//         primaryKey: true,
//         type: Sequelize.INTEGER,
//         references: {
//             model: 'UserAccount',
//             key: 'id'
//         }
//       },
//         native_language: {
//             type: Sequelize.STRING
//         },
//         target_language: {
//             type: Sequelize.STRING
//         },
//         target_language_proficiency: {
//             type: Sequelize.STRING
//         },
//         age: {
//             type: Sequelize.INTEGER
//         },
//         gender: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         profession: {
//             allowNull: false,
//             type: Sequelize.STRING
//         },
//         hobby: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         mbti: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         dates_available: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         times_available: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         visibility: {
//             allowNull: true,
//             type: Sequelize.STRING
//         },
//         friends_list: {                
//             allowNull: true,
//             type: Sequelize.JSON         
//         },
//         createdAt: {
//             allowNull: false,
//             type: Sequelize.DATE
//         },
//         updatedAt: {
//             allowNull: false,
//             type: Sequelize.DATE
//         }});
//   },
//   down: async (queryInterface, Sequelize) => {
//     await queryInterface.dropTable('UserProfile');
//   }
// };

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // If the table is already there, bail out quietly
    const tableName = 'UserProfiles';
    let exists = false;
    try {
      await queryInterface.describeTable(tableName);
      exists = true;
    } catch (_) {
      exists = false;
    }

    if (!exists) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        // TODO: add the columns you actually use in UserProfiles
        // userId: { type: Sequelize.INTEGER, allowNull: false },
        // ...
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }
  },

  async down(queryInterface /*, Sequelize */) {
    // If you don’t want to drop, you can no-op here
    // return queryInterface.dropTable('UserProfiles');
    return Promise.resolve();
  }
};
