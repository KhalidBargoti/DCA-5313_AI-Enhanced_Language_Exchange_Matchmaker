// 'use strict';

// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     await queryInterface.addColumn('ChatModel', 'aiAccessAllowed', {
//       type: Sequelize.BOOLEAN,
//       allowNull: false,
//       defaultValue: true,
//       after: 'receiverId'
//     });
//     // Optional: add an index if you'll filter on it
//     await queryInterface.addIndex('ChatModel', ['aiAccessAllowed']);
//   },

//   down: async (queryInterface, Sequelize) => {
//     await queryInterface.removeIndex('ChatModel', ['aiAccessAllowed']).catch(()=>{});
//     await queryInterface.removeColumn('ChatModel', 'aiAccessAllowed');
//   }
// };
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ChatModels', 'aiAccessAllowed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('ChatModels', 'aiAccessAllowed');
  }
};