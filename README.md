# GitLab MR MCP

A Model Context Protocol (MCP) server for interacting with GitLab merge requests and issues.

## Overview

This project implements a server using the Model Context Protocol (MCP) that allows AI agents to interact with GitLab repositories. It provides tools for:

- Fetching merge request details
- Getting merge request diffs
- Adding comments to merge requests
- Adding line-specific comments to code in merge request diffs
- Fetching issue details

## Setup

### Prerequisites

- Node.js
- GitLab access token with API access
- GitLab project ID(s)

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
export PR_MCP_GITLAB_TOKEN=your_gitlab_token
export PR_MCP_GITLAB_PROJECT_ID=your_project_id
export PR_MCP_GITLAB_ISSUES_PROJECT_ID=your_issues_project_id  # Optional, defaults to PROJECT_ID
```

### Running the Server

```bash
npm start
```

For use with MCP clients, you can run:

```bash
npx -y @modelcontextprotocol/inspector npm start
```

## Available Tools

### `list_open_merge_requests`

Lists all open merge requests in the specified project.

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_open_merge_requests"
  }
}
```

### `get_merge_request_details`

Gets detailed information about a specific merge request.

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_merge_request_details",
    "arguments": {
      "merge_request_iid": "42"
    }
  }
}
```

### `add_merge_request_comment`

Adds a general comment to a merge request.

```json
{
  "method": "tools/call",
  "params": {
    "name": "add_merge_request_comment",
    "arguments": {
      "merge_request_iid": "42",
      "comment": "This is a comment on the merge request"
    }
  }
}
```

### `add_merge_request_diff_comment`

Adds a comment to a specific line in a file within a merge request.

```json
{
  "method": "tools/call",
  "params": {
    "name": "add_merge_request_diff_comment",
    "arguments": {
      "merge_request_iid": "42",
      "comment": "This is a comment on a specific line",
      "base_sha": "abc123",
      "start_sha": "def456",
      "head_sha": "ghi789",
      "file_path": "path/to/file.js",
      "line_number": 42
    }
  }
}
```

### `get_merge_request_diff`

Gets the diff for a merge request.

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_merge_request_diff",
    "arguments": {
      "merge_request_iid": "42"
    }
  }
}
```

### `get_issue_details`

Gets detailed information about a specific issue.

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_issue_details",
    "arguments": {
      "issue_iid": "42"
    }
  }
}
```

### `check_gitlab_token_access`

Checks the access level of your GitLab token.

```json
{
  "method": "tools/call",
  "params": {
    "name": "check_gitlab_token_access"
  }
}
```

## Troubleshooting

If you encounter permissions issues (403 Forbidden), check:

1. Your GitLab token has the proper scopes (api, read_api)
2. The token user has proper access to the projects
3. The project IDs are correct
4. Run the `check_gitlab_token_access` tool to diagnose permission issues

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.