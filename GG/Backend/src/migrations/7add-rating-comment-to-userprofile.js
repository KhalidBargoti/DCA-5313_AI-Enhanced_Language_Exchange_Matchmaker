export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('userProfile', 'rating', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Rating given by other users after calls',
  });

  await queryInterface.addColumn('userProfile', 'comment', {
    type: Sequelize.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Comment given by other users after calls',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('userProfile', 'rating');
  await queryInterface.removeColumn('userProfile', 'comment');
}
