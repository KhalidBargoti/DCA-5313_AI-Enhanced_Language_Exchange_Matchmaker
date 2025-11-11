export default (sequelize, DataTypes) => {
  const Transcript = sequelize.define('Transcript', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    transcript: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    }
  }, {
    tableName: 'Transcripts',
    timestamps: true
  });

  Transcript.associate = (models) => {
    Transcript.belongsToMany(models.User, {
      through: models.TranscriptUser,
      foreignKey: 'transcriptId',
      otherKey: 'userId',
      as: 'Users'
    });

    Transcript.hasMany(models.TranscriptUser, { 
      foreignKey: 'transcriptId' 
    });
  };

  return Transcript;
};
