import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { enhanceMcpServer, registerTool } from "./libs/tool-utils.js";
import {
    LinearCreateCommentTool,
    LinearCreateIssueTool,
    LinearCreateProjectTool,
    LinearGetCommentTool,
    LinearGetIssueTool,
    LinearGetProfileTool,
    LinearGetTeamIdTool,
    LinearSearchIssuesTool,
    LinearUpdateCommentTool,
    LinearUpdateIssueTool
} from "./tools/linear/tools.js";

/**
 * Initialize and start the MCP server
 */
async function main() {
  try {
    // Create server instance
    const server = new McpServer({
      name: "mcp-linear-app",
      version: "0.0.1",
    });

    // Enable object-based tool registration
    enhanceMcpServer();

    // Register all tools
    registerTool(server, [
      LinearSearchIssuesTool,
      LinearGetProfileTool,
      LinearCreateIssueTool,
      LinearCreateCommentTool,
      LinearUpdateCommentTool,
      LinearGetIssueTool,
      LinearGetTeamIdTool,
      LinearUpdateIssueTool,
      LinearGetCommentTool,
      LinearCreateProjectTool,
    ]);

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // console.log("MCP Server running on stdio");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the server
main();