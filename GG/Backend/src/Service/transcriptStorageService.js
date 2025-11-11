import { Transcript, User, TranscriptUser } from './models/index.js'; // Adjust path as needed

/**
 * Store a new transcript with associated users
 * @param {string} sessionId - Unique session identifier
 * @param {string} transcript - The transcript text content
 * @param {number[]} userIds - Array of user IDs to associate with this transcript
 * @returns {Promise<Object>} The created transcript with associated users
 */
export async function storeTranscript(sessionId, transcript, userIds) {
  try {
    // Create the transcript
    const newTranscript = await Transcript.create({
      sessionId,
      transcript
    });

    // Associate users with the transcript
    if (userIds && userIds.length > 0) {
      const transcriptUsers = userIds.map(userId => ({
        transcriptId: newTranscript.id,
        userId
      }));
      
      await TranscriptUser.bulkCreate(transcriptUsers);
    }

    // Fetch and return the transcript with associated users
    const transcriptWithUsers = await Transcript.findByPk(newTranscript.id, {
      include: [{
        model: User,
        through: { attributes: [] } // Exclude junction table attributes
      }]
    });

    return transcriptWithUsers;
  } catch (error) {
    throw new Error(`Failed to store transcript: ${error.message}`);
  }
}

/**
 * Retrieve a transcript by session ID
 * @param {string} sessionId - The session identifier
 * @returns {Promise<Object|null>} The transcript with associated users, or null if not found
 */
export async function getTranscriptBySessionId(sessionId) {
  try {
    const transcript = await Transcript.findOne({
      where: { sessionId },
      include: [{
        model: User,
        through: { attributes: [] }
      }]
    });

    return transcript;
  } catch (error) {
    throw new Error(`Failed to retrieve transcript: ${error.message}`);
  }
}

/**
 * Retrieve all transcripts for a specific user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of transcripts associated with the user
 */
export async function getTranscriptsByUserId(userId) {
  try {
    const transcripts = await Transcript.findAll({
      include: [{
        model: User,
        where: { id: userId },
        through: { attributes: [] }
      }]
    });

    return transcripts;
  } catch (error) {
    throw new Error(`Failed to retrieve transcripts for user: ${error.message}`);
  }
}

/**
 * Add users to an existing transcript
 * @param {string} sessionId - The session identifier
 * @param {number[]} userIds - Array of user IDs to add
 * @returns {Promise<Object>} The updated transcript with all users
 */
export async function addUsersToTranscript(sessionId, userIds) {
  try {
    const transcript = await Transcript.findOne({ where: { sessionId } });
    
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    const transcriptUsers = userIds.map(userId => ({
      transcriptId: transcript.id,
      userId
    }));

    // ignoreDuplicates prevents errors if user already associated
    await TranscriptUser.bulkCreate(transcriptUsers, { 
      ignoreDuplicates: true 
    });

    // Return updated transcript with all users
    return await Transcript.findByPk(transcript.id, {
      include: [{
        model: User,
        through: { attributes: [] }
      }]
    });
  } catch (error) {
    throw new Error(`Failed to add users to transcript: ${error.message}`);
  }
}

/**
 * Update transcript content
 * @param {string} sessionId - The session identifier
 * @param {string} newTranscript - The updated transcript text
 * @returns {Promise<Object>} The updated transcript
 */
export async function updateTranscript(sessionId, newTranscript) {
  try {
    const transcript = await Transcript.findOne({ where: { sessionId } });
    
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    transcript.transcript = newTranscript;
    await transcript.save();

    return transcript;
  } catch (error) {
    throw new Error(`Failed to update transcript: ${error.message}`);
  }
}

/**
 * Delete a transcript
 * @param {string} sessionId - The session identifier
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteTranscript(sessionId) {
  try {
    const result = await Transcript.destroy({
      where: { sessionId }
    });

    return result > 0;
  } catch (error) {
    throw new Error(`Failed to delete transcript: ${error.message}`);
  }
}
