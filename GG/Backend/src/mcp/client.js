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

/**
 * Create a new MCP client (for summarizePracticeSession or other tools)
 * Note: This should ideally also use the singleton, but kept separate for now
 */
export async function createMcpClient() {
  return getMcpClient();
}