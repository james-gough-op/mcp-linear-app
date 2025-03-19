# MCP Linear App

Model Context Protocol (MCP) for integration with Linear as an AI tool. This tool allows your AI to interact with Linear through the Model Context Protocol.

## Features

- **Complete Linear Integration**:
  - Search issues
  - Create new issues
  - Update issues
  - Add comments
  - Update comments
  - Get user profiles
  - Get team information

## Prerequisites

- Node.js 18 or newer
- Linear API key

## How to Get a Linear API Key

To use this application, you need a Linear API key. Here are the steps to obtain one:

1. **Login or Create a Linear Account**
   - Visit [Linear](https://linear.app) and login to your existing account or register to create a new account

2. **Access Workspace Settings**
   - From the main page, click on your username in the top-left corner
   - Select the "Workspace settings" option

3. **Open API Settings**
   - In the "Settings" column on the left side, scroll down until you find "API"
   - Click on the "API" option

4. **Create a New API Key**
   - Enter a label for your API key (e.g., "MCP Linear App")
   - Click the "Create new API key" button

5. **Store the API Key Securely**
   - The API key will be displayed only once
   - Copy and save it in a secure location because Linear will not display it again

> **Important Note**: Linear has a rate limit of 1,500 requests per hour for API keys. Make sure your application follows this limit to avoid 429 Too Many Requests errors.

For more detailed information about obtaining and using Linear API keys, you can visit [this guide on Merge.dev](https://www.merge.dev/blog/linear-api-key).

## How to Use the Tool

### 1. Initial Setup

1. Clone this repository:
```bash
git clone git@github.com:zalab-inc/mcp-linear-app.git
cd mcp-linear-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
LINEAR_API_KEY=your_linear_api_key_here
```

4. Build the project:
```bash
npm run build
```

5. The `dist` folder is now ready to be used for configuration in various AI platforms.

### 2. Cursor Configuration

1. Find your Cursor MCP configuration file:
   - Windows: `C:\Users\<username>\.cursor\mcp.json`
   - macOS: `~/.cursor/mcp.json`
   - Linux: `~/.cursor/mcp.json`

2. Edit the file to add the Linear MCP server configuration:
   ```json
   {
     "mcpServers": {
       "linear": {
         "command": "<path-to-node>",
         "args": [
           "<path-to-project>/dist/index.js"
         ],
         "env": {
           "LINEAR_API_KEY": "your_linear_api_key_here"
         }
       }
     }
   }
   ```

3. Replace the placeholders:
   - `<path-to-node>`: Path to your Node.js executable
   - `<path-to-project>`: Absolute path to your MCP Linear App project directory
   - `your_linear_api_key_here`: Your Linear API key

Example configuration:
```json
{
  "mcpServers": {
    "linear": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "H:\\mcp\\linear\\dist\\index.js"
      ],
      "env": {
        "LINEAR_API_KEY": "lin_api_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

4. Save the file and restart Cursor for the changes to take effect.

### 3. Claude Configuration

To use MCP Linear Tools with Claude, you need to add configuration to Claude's settings file. Follow these steps:

1. Open Claude AI desktop app settings
2. Navigate to the "Developer" section
3. Look for the "Tools" configuration section
4. Add configuration for Linear MCP as follows:

```json
{
  "tools": {
    "linear": {
      "command": "<path-to-node>",
      "args": [
        "<path-to-project>/dist/index.js"
      ],
      "env": {
        "LINEAR_API_KEY": "your_linear_api_key_here"
      }
    }
  }
}
```

5. Replace the placeholders:
   - `<path-to-node>`: Path to your Node.js executable
   - `<path-to-project>`: Absolute path to your MCP Linear App project directory
   - `your_linear_api_key_here`: Your Linear API key

Example configuration:
```json
{
  "tools": {
    "linear": {
      "command": "/usr/local/bin/node",
      "args": [
        "/Users/username/projects/mcp-linear-app/dist/index.js"
      ],
      "env": {
        "LINEAR_API_KEY": "lin_api_xxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 4. Configuration on Other Platforms

The basic principle is the same for other AI platforms that support MCP:

1. Find the configuration area for external tools or MCP
2. Configure it to run Node.js with the `dist/index.js` file from this repository
3. Include your LINEAR_API_KEY in the environment configuration

## Available Tools

After configuration, your AI will have access to the following Linear tools:

- `search_issues` - Search for issues by keyword, status, or priority
- `create_issue` - Create a new issue
- `get_issue` - Get issue details
- `update_issue` - Update an existing issue
- `create_comment` - Add a comment to an issue
- `get_comment` - Get comments from an issue
- `update_comment` - Update or delete a comment
- `get_profile` - Get the current Linear user profile
- `get_team_id` - Get a list of teams and their IDs

## Support and Help

If you experience problems using this tool, please:

1. Check that your Linear API key is valid and has sufficient permissions
2. Make sure Node.js is properly installed
3. Check your MCP configuration in your AI platform
4. Check log files for any error messages that might appear

## Using Linear Tools in AI Environments

Once you've configured the Linear tools in your AI environment, you can start using them by prompting the AI. Here are some examples:

### Using Linear Tools in Cursor

In Cursor, you can simply ask Claude to perform Linear-related tasks:

```
Search for high priority issues in our Linear project.
```

```
Create a new issue in Linear with the title "Improve login page performance" and add it to the backlog.
```

```
Get the details of the issue LIN-123 from Linear.
```

```
Add a comment to issue LIN-456 saying "This is fixed in the latest release. Please verify."
```

```
Update the priority of issue LIN-789 to urgent.
```

### Example Workflow: Creating and Managing Issues

Here's an example workflow showing how you might use these tools:

1. **Finding your team ID**:
   ```
   What's my Linear team ID?
   ```
   Claude will use the `get_team_id` tool to fetch your team information.

2. **Creating a new issue**:
   ```
   Create a new Linear issue titled "Implement password reset feature" for the Engineering team with a high priority. The description should be "Users need a way to reset their passwords when they forget them."
   ```
   Claude will use the `create_issue` tool with the necessary parameters.

3. **Searching for issues**:
   ```
   Find all high priority issues assigned to me that are currently in progress.
   ```
   Claude will use the `search_issues` tool with appropriate filters.

4. **Updating an issue**:
   ```
   Update issue LIN-456 to add the description "This issue has been verified and tested on all browsers."
   ```
   Claude will use the `update_issue` tool to modify the issue.

5. **Adding comments**:
   ```
   Add a comment to issue LIN-789 asking "Is this still a priority for this sprint?"
   ```
   Claude will use the `create_comment` tool to add the comment.

6. **Retrieving comments**:
   ```
   Show me all the comments on issue LIN-321
   ```
   Claude will use the `get_comment` tool to fetch the comments.

These examples demonstrate how naturally you can interact with Linear through your AI assistant once the tools are properly configured.

## Recent Updates

This project has recently been enhanced with improved documentation and Linear tools capabilities. The improvements include:
- Updated README with clearer installation and configuration instructions
- Enhanced documentation with examples for various AI platforms
- Improved Linear tools with better error handling and response formatting
- Added support for managing comments (create, get, update, delete)
- Improved search capability with filtering by status and priority

## License

This project is licensed under the MIT License.