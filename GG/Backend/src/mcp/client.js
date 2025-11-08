import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

export async function createMcpClient() {
  const transport = new HttpClientTransport({
    url: "http://localhost:4000/mcp", // MCP server endpoint
  });

  const client = new Client({
    name: "languageexchangematchmaker-client",
    version: "1.0.0",
  });

  await client.connect(transport);
  console.log("MCP client connected to server");
  return client;
}

export async function callPartnerMatching(userId) {
  const client = await createMcpClient();
  const result = await client.callTool({
    name: "partnerMatching",
    arguments: { userId },
  });
  return result;
}