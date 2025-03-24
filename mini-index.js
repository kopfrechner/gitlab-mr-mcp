// minimal-index.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "MinimalMCP",
  version: "1.0.0",
});

server.tool(
    "say_hello",
    {
      name: z.string().describe("The name of the person to greet"),
    },
    async ({ name }) => {
      try {
        const greeting = `Hello, ${name}! Welcome to the GitLab Review MCP Server.`;
        return {
          content: [{ type: "text", text: greeting }],
        };
      } catch (error) {
        return console.error(error);
      }
    }
  );

(async () => {
  try {
    console.log("Starting Minimal MCP Server..."); // stderr
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Server started successfully."); // stderr
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();