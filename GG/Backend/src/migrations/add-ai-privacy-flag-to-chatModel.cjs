'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Detect which chat table actually exists
    const candidates = ['ChatModels', 'Chats', 'chatmodels', 'chats', 'ChatModel', 'Chat'];
    let table = null;
    let desc = null;

    for (const name of candidates) {
      try {
        // describeTable throws if table doesn't exist
        // eslint-disable-next-line no-await-in-loop
        const d = await queryInterface.describeTable(name);
        table = name;
        desc = d;
        break;
      } catch (e) {
        // keep trying
      }
    }

    if (!table) {
      throw new Error(
        "Could not find a chat table to add 'aiAccessAllowed'. " +
        "Tried: " + candidates.join(', ') + ". " +
        "Check your earlier create-table migration for the actual name."
      );
    }

    // Add the column only if missing (idempotent)
    if (!desc.aiAccessAllowed) {
      await queryInterface.addColumn(table, 'aiAccessAllowed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  },

  async down (queryInterface /*, Sequelize */) {
    const candidates = ['ChatModels', 'Chats', 'chatmodels', 'chats', 'ChatModel', 'Chat'];
    for (const name of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const desc = await queryInterface.describeTable(name);
        if (desc.aiAccessAllowed) {
          await queryInterface.removeColumn(name, 'aiAccessAllowed');
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }
  }
};
