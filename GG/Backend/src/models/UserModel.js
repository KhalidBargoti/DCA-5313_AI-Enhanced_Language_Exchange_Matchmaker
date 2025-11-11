export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    }
  }, {
    tableName: 'Users',
    timestamps: true
  });

  User.associate = (models) => {
    User.belongsToMany(models.Transcript, {
      through: models.TranscriptUser,
      foreignKey: 'userId',
      otherKey: 'transcriptId',
      as: 'Transcripts'
    });

    User.hasMany(models.TranscriptUser, { 
      foreignKey: 'userId' 
    });
  };

  return User;
};
