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
  "get_projects",
  "Get a list of projects",
  {
    verbose: z.boolean().default(false).describe("If true, returns the full project details; if false (default), returns a filtered version"),
  },
  async ({ verbose }) => {
    try {
      const projects = await api.Projects.all({ membership: true });
      const filteredProjects = verbose ? projects : projects.map(project => ({
        id: project.id,
        description: project.description,
        name: project.name,
        path: project.path,
        path_with_namespace: project.path_with_namespace,
        web_url: project.web_url,
      }));

      const projectsText = Array.isArray(filteredProjects) && filteredProjects.length > 0
        ? JSON.stringify(filteredProjects, null, 2)
        : "No projects found.";
      return {
        content: [{ type: "text", text: projectsText }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "list_open_merge_requests",
  "Lists all open merge requests in the project",
  {
    project_id: z.string().describe("The project ID of the merge request"),
    verbose: z.boolean().default(false).describe("If true, returns the full merge request details; if false (default), returns a filtered version"),
  },
  async ({ verbose, project_id }) => {
    try {
      const mergeRequests = await api.MergeRequests.all({ projectId: project_id, state: 'opened' });

      const filteredMergeRequests = verbose ? mergeRequests : mergeRequests.map(mr => ({
        iid: mr.iid,
        project_id: mr.project_id,
        title: mr.title,
        description: mr.description,
        state: mr.state,
        web_url: mr.web_url,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(filteredMergeRequests, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "get_merge_request_details",
  "Get details of a specific merge request of a project",
  {
    project_id: z.string().describe("The project ID of the merge request"),
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
    verbose: z.boolean().default(false).describe("If true, returns the full merge request details; if false (default), returns a filtered version"),
  },
  async ({ project_id, merge_request_iid, verbose }) => {
    try {
      const mr = await api.MergeRequests.show(project_id, merge_request_iid);
      const filteredMr = verbose ? mr : {
        title: mr.title,
        description: mr.description,
        state: mr.state,
        web_url: mr.web_url,
        target_branch: mr.target_branch,
        source_branch: mr.source_branch,
        merge_status: mr.merge_status,
        detailed_merge_status: mr.detailed_merge_status,
        diff_refs: mr.diff_refs,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(filteredMr, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);

server.tool(
  "add_merge_request_comment",
  "Add a comment to a merge request",
  {
    project_id: z.string().describe("The project ID of the merge request"),
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
    comment: z.string().describe("The comment text"),
  },
  async ({ project_id, merge_request_iid, comment }) => {
    try {
      const note = await api.MergeRequestDiscussions.create(project_id, merge_request_iid, comment);
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
  "Add a comment to a merge request at a specific line in a file",
  {
    project_id: z.string().describe("The project ID of the merge request"),
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
    comment: z.string().describe("The comment text"),
    base_sha: z.string().describe("The SHA of the base commit"),
    start_sha: z.string().describe("The SHA of the start commit"),
    head_sha: z.string().describe("The SHA of the head commit"),
    file_path: z.string().describe("The path to the file being commented on"),
    line_number: z.number().describe("The line number in the new version of the file"),
  },
  async ({ project_id, merge_request_iid, comment, base_sha, start_sha, head_sha, file_path, line_number }) => {
    try {
      const discussion = await api.MergeRequestDiscussions.create(
        project_id, 
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
  "Get the diff of a merge request",
  {
    project_id: z.string().describe("The project ID of the merge request"),
    merge_request_iid: z.string().describe("The internal ID of the merge request within the project"),
  },
  async ({ project_id, merge_request_iid }) => {
    try {
      const diff = await api.MergeRequests.allDiffs(project_id, merge_request_iid);
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
  "Get details of a specific issue of a project",
  {
    project_id: z.string().describe("The project ID of the issue"),
    issue_iid: z.string().describe("The internal ID of the issue within the project"),
    verbose: z.boolean().default(false).describe("If true, returns the full issue details; if false (default), returns a filtered version"),
  },
  async ({ project_id, issue_iid, verbose }) => {
    try {
      const issue = await api.Issues.show(issue_iid, { projectId: project_id });

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