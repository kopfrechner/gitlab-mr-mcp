import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Gitlab } from "@gitbeaker/rest";
import { exec } from "child_process";
import { promisify } from "util";
import { number, z } from "zod";


// Promisify exec for async usage
const execAsync = promisify(exec);

// Initialize GitLab API Client
const gitlabToken = process.env.PR_MCP_GITLAB_TOKEN;
if (!gitlabToken) {
  console.error("Error: PR_MCP_GITLAB_TOKEN environment variable is not set.");
  process.exit(1);
}

// Initialize GitLab API Client
const gitlabProjectId = process.env.PR_MCP_GITLAB_PROJECT_ID;
if (!gitlabToken) {
  console.error("Error: PR_MCP_GITLAB_PROJECT_ID environment variable is not set.");
  process.exit(1);
}

const api = new Gitlab({
  token: gitlabToken,
});

//const mergeRequests = await api.Projects.all();
//console.error(mergeRequests);

// Helper function to format errors for MCP responses
const formatErrorResponse = (error) => ({
  content: [{ type: "text", text: `Error: ${error.message} - ${error.cause?.description || "No additional details"}` }],
  isError: true,
});

// Initialize the MCP server
const server = new McpServer({
  name: "GitLabReviewMCP",
  version: "1.0.0",
});

// --- Merge Request Tools ---
server.tool(
  "list_open_merge_requests",
  async () => {
    try {
      const mergeRequests = await api.MergeRequests.all({ projectId: gitlabProjectId, state: 'opened' });
      return {
        content: [{ type: "text", text: JSON.stringify(mergeRequests, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "get_merge_request_details",
  {
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
  },
  async ({ merge_request_iid }) => {
    try {
      const mr = await api.MergeRequests.show(gitlabProjectId, merge_request_iid);
      return {
        content: [{ type: "text", text: JSON.stringify(mr, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "add_merge_request_comment",
  {
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
    comment: z.string().describe("The comment text"),
  },
  async ({ merge_request_iid, comment }) => {
    try {
      const note = await api.MergeRequestDiscussions.create(gitlabProjectId, merge_request_iid, comment);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "get_merge_request_diff",
  {
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
  },
  async ({ merge_request_iid }) => {
    try {
      const diff = await api.MergeRequests.allDiffs(gitlabProjectId, merge_request_iid);
      const diffText = Array.isArray(diff) && diff.length > 0
        ? JSON.stringify(diff, null, 2)
        : "No diff data available for this merge request.";
      return {
        content: [{ type: "text", text: diffText }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

// Connect the server to a transport and start it
(async () => {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();