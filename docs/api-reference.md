# Linear MCP Server API Reference

## Introduction

This document provides comprehensive documentation for the Linear MCP Server API, which enables programmatic interaction with Linear through the MCP Server. The API supports managing labels, projects, cycles, and creating issues with templates.

## Client Implementations

The MCP Server provides two client implementations for interacting with the Linear API:

### enhancedClient (Recommended)

The `enhancedClient` is the recommended implementation for all new development. It provides:

- Standardized error handling with detailed error information
- Type-safe API with comprehensive TypeScript types
- Consistent result patterns for both success and error cases
- Improved performance and reliability
- Both exception-based and result-based error handling patterns

All methods have both a standard version (e.g., `createIssue`) and a "safe" version (e.g., `safeCreateIssue`):
- Standard methods throw exceptions when errors occur
- "Safe" methods return a `LinearResult` object with success/error information

### linearClient (Deprecated)

> **⚠️ DEPRECATED ⚠️**
>
> The `linearClient` is deprecated and will be removed in a future release. It is 
> maintained only for backward compatibility. All new development should use `enhancedClient`.

## Authentication

All Linear interactions are authenticated using the Linear API key configured in the MCP server. The MCP server itself handles authentication with Linear; you don't need to provide authentication credentials in your requests to the MCP server.

## Error Handling

All API endpoints follow a consistent error handling pattern. Possible error responses include:

- **Authentication Error**: The Linear API key is invalid or has insufficient permissions.
- **Permission Error**: The authenticated user lacks permissions for the requested operation.
- **Not Found Error**: A requested resource (issue, project, label, etc.) was not found.
- **Rate Limit Error**: Linear's API rate limit has been exceeded.
- **Validation Error**: Invalid input parameters were provided.
- **General Error**: An unexpected error occurred.

Error responses include a descriptive message to help diagnose the issue.

## Rate Limiting

The MCP server implements rate limiting to comply with Linear's API limits (1,500 requests/hour & 250,000 complexity points/hour). If you receive a rate limit error, retry the request after a delay.

## Linear ID Management

Most operations require Linear entity IDs such as `teamId`, `labelId`, `projectId`, `cycleId`, `issueId`, or `templateId`. These IDs are unique identifiers in the Linear system and must be obtained from Linear (e.g., from the URL when viewing the entity in Linear, or from other API responses).

## API Reference

### Label Management

#### Create Label

Creates a new label in Linear (team-specific or global).

**Tool Name**: `create_label`

**Parameters**:
- `name` (string, required): The name of the label.
- `color` (string, optional): The color of the label in hex format (e.g., "#FF0000").
- `teamId` (string, optional): The team ID to create a team-specific label. If omitted, creates a global/workspace label.

**Example Request**:
```json
{
  "name": "bug",
  "color": "#FF0000",
  "teamId": "team_12345"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Label created successfully. ID: label_67890, Name: bug, Color: #FF0000"
    }
  ]
}
```

**Linear API**: Uses the `labelCreate` GraphQL mutation.

#### Apply Labels to Issue

Applies one or more existing labels to a Linear issue.

**Tool Name**: `apply_labels`

**Parameters**:
- `issueId` (string, required): The ID of the issue to apply labels to.
- `labelIds` (array of strings, required): Array of label IDs to apply to the issue.

**Example Request**:
```json
{
  "issueId": "issue_12345",
  "labelIds": ["label_67890", "label_67891"]
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully applied 2 labels to issue \"Fix login bug\" (ID: issue_12345). The issue now has 3 total labels."
    }
  ]
}
```

**Linear API**: Uses the `issueUpdate` GraphQL mutation.

### Project Management

#### Create Project

Creates a new project in Linear.

**Tool Name**: `create_project`

**Parameters**:
- `name` (string, required): The name of the project.
- `description` (string, optional): Project description.
- `teamIds` (array of strings, optional): IDs of teams associated with this project.
- `color` (string, optional): Project color in hex format.
- `state` (string, optional): Project state (one of: "planned", "started", "paused", "completed", "canceled").

**Example Request**:
```json
{
  "name": "Website Redesign",
  "description": "Redesign company website",
  "teamIds": ["team_12345"],
  "color": "#0000FF",
  "state": "started"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Project created successfully. ID: project_67890, Name: Website Redesign, Teams: Engineering"
    }
  ]
}
```

**Linear API**: Uses the `projectCreate` GraphQL mutation.

#### Assign Issue to Project

Assigns an existing Linear issue to a Linear project.

**Tool Name**: `assign_issue_to_project`

**Parameters**:
- `issueId` (string, required): The ID of the issue to assign to a project.
- `projectId` (string, required): The ID of the project to assign the issue to.

**Example Request**:
```json
{
  "issueId": "issue_12345",
  "projectId": "project_67890"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully assigned issue \"Fix login bug\" (ENG-123) to project \"Website Redesign\" (ID: project_67890)."
    }
  ]
}
```

**Linear API**: Uses the `issueUpdate` GraphQL mutation.

### Cycle Management

#### Add Issue to Cycle

Adds an existing Linear issue to a specific cycle.

**Tool Name**: `add_issue_to_cycle`

**Parameters**:
- `issueId` (string, required): The ID of the issue to add to a cycle.
- `cycleId` (string, required): The ID of the cycle to add the issue to.

**Example Request**:
```json
{
  "issueId": "issue_12345",
  "cycleId": "cycle_67890"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully added issue \"Fix login bug\" (ENG-123) to cycle #4 \"Sprint 4\" (ID: cycle_67890)."
    }
  ]
}
```

**Linear API**: Uses the `issueUpdate` GraphQL mutation.

### Issue Management

#### Create Issue

Creates a new issue in Linear with optional project, cycle, and template.

**Tool Name**: `create_issue`

**Parameters**:
- `teamId` (string, required): The team ID the issue belongs to.
- `title` (string, required): The title of the issue.
- `description` (string, optional): The description of the issue.
- `status` (string, optional): The status of the issue (one of: "triage", "backlog", "todo", "in_progress", "done", "canceled"). Default: "backlog".
- `priority` (string, optional): The priority of the issue (one of: "urgent", "high", "medium", "low", "no_priority"). Default: "no_priority".
- `parentId` (string, optional): The ID of the parent issue, used to create a sub-issue.
- `projectId` (string, optional): The ID of the project to assign the issue to.
- `cycleId` (string, optional): The ID of the cycle to assign the issue to.
- `templateId` (string, optional): The ID of the template to use for the issue.

**Example Request**:
```json
{
  "teamId": "team_12345",
  "title": "Implement login form",
  "description": "Create a login form with email and password fields",
  "status": "todo",
  "priority": "high",
  "projectId": "project_67890",
  "cycleId": "cycle_67890",
  "templateId": "template_67890"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Status: Success\nMessage: Linear issue created\nIssue ID: issue_12345\nAssigned to Project ID: project_67890\nAssigned to Cycle ID: cycle_67890\nTemplate applied: template_67890"
    }
  ]
}
```

**Linear API**: Uses the `issueCreate` GraphQL mutation.

#### Get Issue

Retrieves details of a specific Linear issue.

**Tool Name**: `get_issue`

**Parameters**:
- `issueId` (string, required): The ID of the issue to retrieve.

**Example Request**:
```json
{
  "issueId": "issue_12345"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "ISSUE DETAILS\n=============\nID: issue_12345\nTitle: Implement login form\nDescription: Create a login form with email and password fields\nStatus: Todo\nPriority: High\nTeam: Engineering (ENG)\nURL: https://linear.app/company/issue/ENG-123"
    }
  ]
}
```

**Linear API**: Uses the `issue` GraphQL query.

#### Update Issue

Updates an existing Linear issue.

**Tool Name**: `update_issue`

**Parameters**:
- `issueId` (string, required): The ID of the issue to update.
- `title` (string, optional): The new title for the issue.
- `description` (string, optional): The new description for the issue.
- `status` (string, optional): The new status for the issue.
- `priority` (string, optional): The new priority for the issue.
- `projectId` (string, optional): The ID of the project to move the issue to.
- `cycleId` (string, optional): The ID of the cycle to move the issue to.

**Example Request**:
```json
{
  "issueId": "issue_12345",
  "title": "Implement improved login form",
  "status": "in_progress"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Issue updated successfully. ID: issue_12345, Title: Implement improved login form, Status: In Progress"
    }
  ]
}
```

**Linear API**: Uses the `issueUpdate` GraphQL mutation.

### Team Management

#### Get Team ID

Retrieves the ID of a Linear team by its name.

**Tool Name**: `get_team_id`

**Parameters**:
- `teamName` (string, required): The name of the team to look up.

**Example Request**:
```json
{
  "teamName": "Engineering"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Team found: Engineering\nTeam ID: team_12345\nTeam Key: ENG"
    }
  ]
}
```

**Linear API**: Uses the `teams` GraphQL query.

### User Management

#### Get Profile

Retrieves details about the currently authenticated Linear user.

**Tool Name**: `get_profile`

**Parameters**: None

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "USER PROFILE\n============\nID: user_12345\nName: Jane Smith\nEmail: jane@example.com\nRole: Admin\nActive: Yes"
    }
  ]
}
```

**Linear API**: Uses the `viewer` GraphQL query.

### Comment Management

#### Create Comment

Creates a new comment on a Linear issue.

**Tool Name**: `create_comment`

**Parameters**:
- `issueId` (string, required): The ID of the issue to comment on.
- `body` (string, required): The text content of the comment.

**Example Request**:
```json
{
  "issueId": "issue_12345",
  "body": "I've started working on this. Should be ready for review by tomorrow."
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Comment created successfully. ID: comment_67890, Issue: ENG-123"
    }
  ]
}
```

**Linear API**: Uses the `commentCreate` GraphQL mutation.

#### Get Comment

Retrieves a specific comment from Linear.

**Tool Name**: `get_comment`

**Parameters**:
- `commentId` (string, required): The ID of the comment to retrieve.

**Example Request**:
```json
{
  "commentId": "comment_67890"
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "COMMENT DETAILS\n===============\nID: comment_67890\nIssue: ENG-123 (issue_12345)\nBody: I've started working on this. Should be ready for review by tomorrow.\nCreated by: Jane Smith\nCreated at: 2023-01-15T14:30:00Z"
    }
  ]
}
```

**Linear API**: Uses the `comment` GraphQL query.

#### Update Comment

Updates an existing comment on a Linear issue.

**Tool Name**: `update_comment`

**Parameters**:
- `commentId` (string, required): The ID of the comment to update.
- `body` (string, required): The new text content for the comment.

**Example Request**:
```json
{
  "commentId": "comment_67890",
  "body": "I've completed this task. Ready for review now."
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Comment updated successfully. ID: comment_67890"
    }
  ]
}
```

**Linear API**: Uses the `commentUpdate` GraphQL mutation.

### Search Functionality

#### Search Issues

Searches for Linear issues based on provided query parameters.

**Tool Name**: `search_issues`

**Parameters**:
- `query` (string, required): The search query string.
- `teamIds` (array of strings, optional): Limit search to specific teams.
- `limit` (number, optional): Maximum number of results to return. Default: 10.

**Example Request**:
```json
{
  "query": "login form",
  "teamIds": ["team_12345"],
  "limit": 5
}
```

**Example Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "SEARCH RESULTS (5 of 8 total)\n==========================\n1. ENG-123: Implement login form\n   Status: Todo, Priority: High\n   URL: https://linear.app/company/issue/ENG-123\n\n2. ENG-145: Fix login form validation\n   Status: In Progress, Priority: Medium\n   URL: https://linear.app/company/issue/ENG-145\n\n..."
    }
  ]
}
```

**Linear API**: Uses the `issueSearch` GraphQL query.

## enhancedClient API Reference

This section documents the methods available in the recommended `enhancedClient` implementation.

### Core GraphQL Methods

#### executeGraphQLQuery

Executes a raw GraphQL query with error handling.

**Signature:**
```typescript
async executeGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>>
```

**Parameters:**
- `query` (string): The GraphQL query string
- `variables` (optional object): Variables for the query

**Returns:** The raw GraphQL response

**Throws:** `LinearError` with appropriate type and message

**Example:**
```typescript
try {
  const response = await enhancedClient.executeGraphQLQuery(`
    query GetIssue($id: ID!) {
      issue(id: $id) {
        id
        title
        description
      }
    }
  `, { id: "issue_12345" });
  
  console.log(response.data.issue);
} catch (error) {
  if (error instanceof LinearError) {
    console.error(error.userMessage);
  }
}
```

#### safeExecuteGraphQLQuery

Safe version of `executeGraphQLQuery` that returns a `LinearResult` instead of throwing exceptions.

**Signature:**
```typescript
async safeExecuteGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearResult<T>>
```

**Parameters:**
- `query` (string): The GraphQL query string
- `variables` (optional object): Variables for the query

**Returns:** A `LinearResult` object with either:
- `success: true` and the response data, or
- `success: false` and an error object

**Example:**
```typescript
const result = await enhancedClient.safeExecuteGraphQLQuery(`
  query GetIssue($id: ID!) {
    issue(id: $id) {
      id
      title
      description
    }
  }
`, { id: "issue_12345" });

if (result.success) {
  console.log(result.data.issue);
} else {
  console.error(result.error.userMessage);
}
```

#### executeGraphQLMutation

Executes a GraphQL mutation with error handling.

**Signature:**
```typescript
async executeGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>>
```

**Parameters:**
- `mutation` (string): The GraphQL mutation string
- `variables` (optional object): Variables for the mutation

**Returns:** The raw GraphQL response

**Throws:** `LinearError` with appropriate type and message

#### safeExecuteGraphQLMutation

Safe version of `executeGraphQLMutation` that returns a `LinearResult` instead of throwing exceptions.

**Signature:**
```typescript
async safeExecuteGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearResult<T>>
```

**Parameters:**
- `mutation` (string): The GraphQL mutation string
- `variables` (optional object): Variables for the mutation

**Returns:** A `LinearResult` object

### Issue Management

#### issue

Gets a single issue by ID.

**Signature:**
```typescript
async issue(id: string): Promise<Issue>
```

**Parameters:**
- `id` (string): The Linear issue ID

**Returns:** An `Issue` object

**Throws:** `LinearError` if the issue doesn't exist or another error occurs

#### safeIssue

Safe version of `issue` that returns a `LinearResult`.

**Signature:**
```typescript
async safeIssue(id: string): Promise<LinearResult<Issue>>
```

**Parameters:**
- `id` (string): The Linear issue ID

**Returns:** A `LinearResult<Issue>` object

#### createIssue

Creates a new issue.

**Signature:**
```typescript
async createIssue(input: IssueCreateInput): Promise<IssuePayload>
```

**Parameters:**
- `input` (IssueCreateInput): The issue creation parameters

**Returns:** An `IssuePayload` object containing the created issue

**Throws:** `LinearError` if creation fails

#### safeCreateIssue

Safe version of `createIssue` that returns a `LinearResult`.

**Signature:**
```typescript
async safeCreateIssue(input: IssueCreateInput): Promise<LinearResult<IssuePayload>>
```

**Parameters:**
- `input` (IssueCreateInput): The issue creation parameters

**Returns:** A `LinearResult<IssuePayload>` object

#### updateIssue

Updates an existing issue.

**Signature:**
```typescript
async updateIssue(id: string, input: IssueUpdateInput): Promise<IssuePayload>
```

**Parameters:**
- `id` (string): The Linear issue ID
- `input` (IssueUpdateInput): The update parameters

**Returns:** An `IssuePayload` object containing the updated issue

**Throws:** `LinearError` if update fails

#### safeUpdateIssue

Safe version of `updateIssue` that returns a `LinearResult`.

**Signature:**
```typescript
async safeUpdateIssue(id: string, input: IssueUpdateInput): Promise<LinearResult<IssuePayload>>
```

**Parameters:**
- `id` (string): The Linear issue ID
- `input` (IssueUpdateInput): The update parameters

**Returns:** A `LinearResult<IssuePayload>` object

#### issues

Gets issues matching a filter.

**Signature:**
```typescript
async issues(filter?: IssueFilter, first: number = 50, after?: string): Promise<IssueConnection>
```

**Parameters:**
- `filter` (optional IssueFilter): Filter criteria
- `first` (optional number): Maximum number of issues to return (default: 50)
- `after` (optional string): Cursor for pagination

**Returns:** An `IssueConnection` object

**Throws:** `LinearError` if query fails

#### safeIssues

Safe version of `issues` that returns a `LinearResult`.

**Signature:**
```typescript
async safeIssues(filter?: IssueFilter, first: number = 50, after?: string): Promise<LinearResult<IssueConnection>>
```

**Parameters:**
- `filter` (optional IssueFilter): Filter criteria
- `first` (optional number): Maximum number of issues to return (default: 50)
- `after` (optional string): Cursor for pagination

**Returns:** A `LinearResult<IssueConnection>` object

### Comment Management

#### createComment

Creates a comment on an issue.

**Signature:**
```typescript
async createComment(input: CommentCreateInput): Promise<CommentPayload>
```

**Parameters:**
- `input` (CommentCreateInput): The comment creation parameters

**Returns:** A `CommentPayload` object containing the created comment

**Throws:** `LinearError` if creation fails

#### safeCreateComment

Safe version of `createComment` that returns a `LinearResult`.

**Signature:**
```typescript
async safeCreateComment(input: CommentCreateInput): Promise<LinearResult<CommentPayload>>
```

**Parameters:**
- `input` (CommentCreateInput): The comment creation parameters

**Returns:** A `LinearResult<CommentPayload>` object

#### updateComment

Updates an existing comment.

**Signature:**
```typescript
async updateComment(id: string, input: CommentUpdateInput): Promise<CommentPayload>
```

**Parameters:**
- `id` (string): The Linear comment ID
- `input` (CommentUpdateInput): The update parameters

**Returns:** A `CommentPayload` object containing the updated comment

**Throws:** `LinearError` if update fails

#### safeUpdateComment

Safe version of `updateComment` that returns a `LinearResult`.

**Signature:**
```typescript
async safeUpdateComment(id: string, input: CommentUpdateInput): Promise<LinearResult<CommentPayload>>
```

**Parameters:**
- `id` (string): The Linear comment ID
- `input` (CommentUpdateInput): The update parameters

**Returns:** A `LinearResult<CommentPayload>` object

#### deleteComment

Deletes a comment.

**Signature:**
```typescript
async deleteComment(id: string): Promise<DeletePayload>
```

**Parameters:**
- `id` (string): The Linear comment ID

**Returns:** A `DeletePayload` object

**Throws:** `LinearError` if deletion fails

#### safeDeleteComment

Safe version of `deleteComment` that returns a `LinearResult`.

**Signature:**
```typescript
async safeDeleteComment(id: string): Promise<LinearResult<DeletePayload>>
```

**Parameters:**
- `id` (string): The Linear comment ID

**Returns:** A `LinearResult<DeletePayload>` object

### User Management

#### viewer

Gets the current authenticated user profile.

**Signature:**
```typescript
async viewer(): Promise<User>
```

**Returns:** A `User` object

**Throws:** `LinearError` if authentication fails or other errors occur

#### safeViewer

Safe version of `viewer` that returns a `LinearResult`.

**Signature:**
```typescript
async safeViewer(): Promise<LinearResult<User>>
```

**Returns:** A `LinearResult<User>` object

### Team Management

#### team

Gets a single team by ID.

**Signature:**
```typescript
async team(id: string): Promise<Team>
```

**Parameters:**
- `id` (string): The Linear team ID

**Returns:** A `Team` object

**Throws:** `LinearError` if the team doesn't exist or another error occurs

#### safeTeam

Safe version of `team` that returns a `LinearResult`.

**Signature:**
```typescript
async safeTeam(id: string): Promise<LinearResult<Team>>
```

**Parameters:**
- `id` (string): The Linear team ID

**Returns:** A `LinearResult<Team>` object

#### teams

Gets teams matching a filter.

**Signature:**
```typescript
async teams(filter?: TeamFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<TeamConnection>
```

**Parameters:**
- `filter` (optional TeamFilter): Filter criteria
- `first` (optional number): Maximum number of teams to return (default: 50)
- `after` (optional string): Cursor for pagination
- `includeArchived` (optional boolean): Whether to include archived teams (default: false)

**Returns:** A `TeamConnection` object

**Throws:** `LinearError` if query fails

#### safeTeams

Safe version of `teams` that returns a `LinearResult`.

**Signature:**
```typescript
async safeTeams(filter?: TeamFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<LinearResult<TeamConnection>>
```

**Parameters:**
- `filter` (optional TeamFilter): Filter criteria
- `first` (optional number): Maximum number of teams to return (default: 50)
- `after` (optional string): Cursor for pagination
- `includeArchived` (optional boolean): Whether to include archived teams (default: false)

**Returns:** A `LinearResult<TeamConnection>` object

### Cycle Management

#### cycle

Gets a single cycle by ID.

**Signature:**
```typescript
async cycle(id: string): Promise<Cycle>
```

**Parameters:**
- `id` (string): The Linear cycle ID

**Returns:** A `Cycle` object

**Throws:** `LinearError` if the cycle doesn't exist or another error occurs

#### safeCycle

Safe version of `cycle` that returns a `LinearResult`.

**Signature:**
```typescript
async safeCycle(id: string): Promise<LinearResult<Cycle>>
```

**Parameters:**
- `id` (string): The Linear cycle ID

**Returns:** A `LinearResult<Cycle>` object

#### cycles

Gets cycles matching a filter.

**Signature:**
```typescript
async cycles(filter?: CycleFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<CycleConnection>
```

**Parameters:**
- `filter` (optional CycleFilter): Filter criteria
- `first` (optional number): Maximum number of cycles to return (default: 50)
- `after` (optional string): Cursor for pagination
- `includeArchived` (optional boolean): Whether to include archived cycles (default: false)

**Returns:** A `CycleConnection` object

**Throws:** `LinearError` if query fails

#### safeCycles

Safe version of `cycles` that returns a `LinearResult`.

**Signature:**
```typescript
async safeCycles(filter?: CycleFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<LinearResult<CycleConnection>>
```

**Parameters:**
- `filter` (optional CycleFilter): Filter criteria
- `first` (optional number): Maximum number of cycles to return (default: 50)
- `after` (optional string): Cursor for pagination
- `includeArchived` (optional boolean): Whether to include archived cycles (default: false)

**Returns:** A `LinearResult<CycleConnection>` object

#### addIssueToCycle

Adds an issue to a cycle.

**Signature:**
```typescript
async addIssueToCycle(issueId: string, cycleId: string): Promise<IssuePayload>
```

**Parameters:**
- `issueId` (string): The Linear issue ID
- `cycleId` (string): The Linear cycle ID

**Returns:** An `IssuePayload` object containing the updated issue

**Throws:** `LinearError` if the operation fails

#### safeAddIssueToCycle

Safe version of `addIssueToCycle` that returns a `LinearResult`.

**Signature:**
```typescript
async safeAddIssueToCycle(issueId: string, cycleId: string): Promise<LinearResult<IssuePayload>>
```

**Parameters:**
- `issueId` (string): The Linear issue ID
- `cycleId` (string): The Linear cycle ID

**Returns:** A `LinearResult<IssuePayload>` object

### Label Management

#### createIssueLabel

Creates a new issue label.

**Signature:**
```typescript
async createIssueLabel(input: IssueLabelCreateInput): Promise<IssueLabelPayload>
```

**Parameters:**
- `input` (IssueLabelCreateInput): The label creation parameters

**Returns:** An `IssueLabelPayload` object containing the created label

**Throws:** `LinearError` if creation fails

#### safeCreateIssueLabel

Safe version of `createIssueLabel` that returns a `LinearResult`.

**Signature:**
```typescript
async safeCreateIssueLabel(input: IssueLabelCreateInput): Promise<LinearResult<IssueLabelPayload>>
```

**Parameters:**
- `input` (IssueLabelCreateInput): The label creation parameters

**Returns:** A `LinearResult<IssueLabelPayload>` object 