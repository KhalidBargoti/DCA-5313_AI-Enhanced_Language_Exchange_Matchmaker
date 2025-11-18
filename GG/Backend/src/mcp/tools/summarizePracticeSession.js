import db from "../../models/index.js";

export async function getTranscriptBySessionId(sessionId) {
  try {
    const transcript = await db.Transcript.findOne({
      where: { sessionId },
      include: [{
        model: db.UserAccount,
        as: 'userAccounts',
        through: { attributes: [] },
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });

    return transcript;
  } catch (error) {
    throw new Error(`Failed to retrieve transcript: ${error.message}`);
  }
}

export async function summarizePracticeSession(args) {
  try {
    const { chatId, userId } = args;

    // Retrieve the transcript from the database
    const transcript = await getTranscriptBySessionId(chatId);
    
    if (!transcript) {
      return {
        error: 'Transcript not found',
        chatId
      };
    }

    // Check if the requesting user has access to this transcript
    const hasAccess = transcript.userAccounts?.some(
      user => user.id === userId
    );

    if (!hasAccess) {
      return {
        error: 'Access denied',
        message: 'You do not have permission to access this transcript'
      };
    }

    const prompt = `Please provide a detailed summary of the following language practice session transcript. Include:
- Main topics discussed
- Key vocabulary and phrases used
- Grammar patterns observed
- Overall flow of the conversation
- Notable moments or achievements

Transcript:
${transcript.transcript}`;

    
    return {
      success: true,
      chatId: transcript.chatId,
      createdAt: transcript.createdAt,
      participants: transcript.userAccounts?.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      })),
      prompt, // The MCP server will use this to call Claude
      transcriptLength: transcript.transcript.length
    };

  } catch (error) {
    console.error('Error in summarizePracticeSession tool:', error);
    return {
      error: 'Failed to summarize practice session',
      details: error.message
    };
  }
}
