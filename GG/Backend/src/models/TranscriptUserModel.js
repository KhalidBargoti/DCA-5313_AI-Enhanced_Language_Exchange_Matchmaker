export default (sequelize, DataTypes) => {
  const TranscriptUser = sequelize.define('TranscriptUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    transcriptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Transcripts',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'TranscriptUsers',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['transcriptId', 'userId'],
        name: 'unique_transcript_user'
      }
    ]
  });

  TranscriptUser.associate = (models) => {
    TranscriptUser.belongsTo(models.Transcript, { 
      foreignKey: 'transcriptId' 
    });
    
    TranscriptUser.belongsTo(models.User, { 
      foreignKey: 'userId' 
    });
  };

  return TranscriptUser;
};
