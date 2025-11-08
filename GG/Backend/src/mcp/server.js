import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { partnerMatching } from "./tools/partnerMatching.js";

export async function startMCPServer() {
  const server = new Server({
    name: "languageexchangematchmaker-server",
    version: "1.0.0",
  });

  server.addTool({
    name: "partnerMatching",
    description: "Suggest compatible language practice partners based on user preferences.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "number" },
      },
      required: ["userId"],
    },
    async handler(args) {
      return await partnerMatching(args);
    },
  });

  const httpServer = http.createServer();
  const transport = new HttpServerTransport({
    server: httpServer,
    path: "/mcp",
  });

  await server.connect(transport);

  // Start listening
  const port = process.env.MCP_PORT || 4000;
  httpServer.listen(port, () => {
    console.log(`MCP server running on http://localhost:${port}/mcp`);
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer();
}