export async function up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserProfile', 'rating', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Rating given by other users after calls',
    });
  
    await queryInterface.addColumn('UserProfile', 'comment', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Comment given by other users after calls',
    });
  }
  
  export async function down(queryInterface) {
    await queryInterface.removeColumn('UserProfile', 'rating');
    await queryInterface.removeColumn('UserProfile', 'comment');
  }