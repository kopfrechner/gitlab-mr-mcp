import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Gitlab } from "@gitbeaker/rest";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";


// Promisify exec for async usage
const execAsync = promisify(exec);

// Initialize GitLab API Client
const gitlabToken = process.env.PR_MCP_GITLAB_TOKEN;
if (!gitlabToken) {
  console.error("Error: PR_MCP_GITLAB_TOKEN environment variable is not set.");
  process.exit(1);
}

// Initialize GitLab project IDs
const gitlabProjectId = process.env.PR_MCP_GITLAB_PROJECT_ID;
if (!gitlabProjectId) {
  console.error("Error: PR_MCP_GITLAB_PROJECT_ID environment variable is not set.");
  process.exit(1);
}

// Initialize GitLab issues project ID (can be the same or different from the main project)
const gitlabIssuesProjectId = process.env.PR_MCP_GITLAB_ISSUES_PROJECT_ID || gitlabProjectId; // Fallback to main project if not set

const api = new Gitlab({
  token: gitlabToken,
});


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
  "add_merge_request_diff_comment",
  {
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
    comment: z.string().describe("The comment text"),
    base_sha: z.string().describe("The SHA of the base commit"),
    start_sha: z.string().describe("The SHA of the start commit"),
    head_sha: z.string().describe("The SHA of the head commit"),
    file_path: z.string().describe("The path to the file being commented on"),
    line_number: z.number().describe("The line number in the new version of the file"),
  },
  async ({ merge_request_iid, comment, base_sha, start_sha, head_sha, file_path, line_number }) => {
    try {
      const discussion = await api.MergeRequestDiscussions.create(
        gitlabProjectId, 
        merge_request_iid, 
        comment,
        {
          position: {
            base_sha: base_sha,
            start_sha: start_sha,
            head_sha: head_sha,
            old_path: file_path,
            new_path: file_path,
            position_type: 'text',
            new_line: line_number,
          },
        }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(discussion, null, 2) }],
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

server.tool(
  "get_issue_details",
  {
    issue_iid: z.string().describe("The internal ID of the issue within the project"),
    verbose: z.boolean().default(false).describe("If true, returns the full issue details; if false (default), returns a filtered version"),
  },
  async ({ issue_iid, verbose }) => {
    try {
      const issue = await api.Issues.show(issue_iid, { projectId: gitlabIssuesProjectId });

      const filteredIssue = verbose ? issue : {
        title: issue.title,
        description: issue.description,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(filteredIssue, null, 2) }],
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