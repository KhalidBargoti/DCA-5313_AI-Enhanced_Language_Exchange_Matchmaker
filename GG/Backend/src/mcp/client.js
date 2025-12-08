import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let mcpClientInstance = null;
let mcpClientPromise = null;

export async function getMcpClient() {
  // If client already exists and is connected, return it
  if (mcpClientInstance) {
    return mcpClientInstance;
  }
  if (mcpClientPromise) {
    return mcpClientPromise;
  }

  // Create new client connection
  mcpClientPromise = (async () => {
    try {
      const transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:4000/mcp") // MCP server endpoint
      );

      const client = new Client(
        {
          name: "languageexchangematchmaker-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      console.log("MCP client connected to server");
      
      mcpClientInstance = client;
      mcpClientPromise = null; // Reset promise after successful connection
      return client;
    } catch (error) {
      mcpClientPromise = null; // Reset promise on error
      console.error("Error creating MCP client:", error);
      throw error;
    }
  })();

  return mcpClientPromise;
}

export async function callPartnerMatching(userId, criteria = {}) {
  // Ensure userId is a number
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  if (isNaN(numericUserId)) {
    return {
      error: "Invalid userId provided",
      details: `userId must be a number, got: ${userId} (type: ${typeof userId})`
    };
  }

  try {
    const client = await getMcpClient();
    const args = { userId: numericUserId };
    
    if (criteria && (criteria.zodiac || criteria.mbti)) {
      args.criteria = {};
      if (criteria.zodiac) args.criteria.zodiac = criteria.zodiac;
      if (criteria.mbti) args.criteria.mbti = criteria.mbti;
    }
    
    const result = await client.callTool({ name: "partnerMatching", arguments: args });
    
    return result;
  } catch (error) {
    console.error("Error calling partnerMatching tool:", error);
    return {
      error: "Failed to call partnerMatching tool",
      details: error.message
    };
  }
}

export async function callSummarizePracticeSession(chatId, requestingUserId) {
  // Ensure requestingUserId is a number
  const numericChatId = typeof chatId === 'string'
    ? parseInt(chatId, 10)
    : chatId;
  if (isNaN(chatId)) {
      return {
        error: "Invalid chatId provided",
        details: `chatId must be a number, got ${chatId} (type: ${typeof chatId})`
      };
  }

  const numericUserId = typeof requestingUserId === 'string' 
    ? parseInt(requestingUserId, 10) 
    : requestingUserId;
  
  if (isNaN(numericUserId)) {
    return {
      error: "Invalid requestingUserId provided",
      details: `requestingUserId must be a number, got: ${requestingUserId} (type: ${typeof requestingUserId})`
    };
  }

  try {
    const client = await getMcpClient();
    
    const args = {
      chatId,
      userId: numericUserId,
    };
    const result = await client.callTool({ 
      name: "summarizePracticeSession", 
      arguments: args 
    });
    
    return result;
  } catch (error) {
    console.error("Error calling summarizePracticeSession tool:", error);
    return {
      error: "Failed to call summarizePracticeSession tool",
      details: error.message
    };
  }
}

/**
 * Call the scheduleMeeting tool
 */
export async function callScheduleMeeting(userId, targetUserName, preferredDay = null, preferredTime = null) {
  // Ensure userId is a number
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  if (isNaN(numericUserId)) {
    return {
      error: "Invalid userId provided",
      details: `userId must be a number, got: ${userId} (type: ${typeof userId})`
    };
  }

  if (!targetUserName || typeof targetUserName !== 'string') {
    return {
      error: "Invalid targetUserName provided",
      details: "targetUserName must be a non-empty string"
    };
  }

  try {
    const client = await getMcpClient();
    
    const args = {
      userId: numericUserId,
      targetUserName: targetUserName
    };
    
    if (preferredDay) {
      args.preferredDay = preferredDay;
    }
    
    if (preferredTime) {
      args.preferredTime = preferredTime;
    }
    
    const result = await client.callTool({ 
      name: "scheduleMeeting", 
      arguments: args 
    });
    
    return result;
  } catch (error) {
    console.error("Error calling scheduleMeeting tool:", error);
    return {
      error: "Failed to call scheduleMeeting tool",
      details: error.message
    };
  }
}

/**
 * Create a new MCP client (for summarizePracticeSession or other tools)
 * Note: This should ideally also use the singleton, but kept separate for now
 */
export async function createMcpClient() {
  return getMcpClient();
}
