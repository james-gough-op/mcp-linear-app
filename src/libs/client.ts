import { LinearClient, LinearDocument } from '@linear/sdk';
import dotenv from 'dotenv';

import {
  LinearError,
  LinearErrorType,
  LinearResult,
  createErrorResult,
  createSuccessResult,
  logLinearError
} from './errors.js';
import { LinearEntityType, validateLinearId } from './id-management.js';

// Load environment variables
dotenv.config();

// Get the API key from environment variable
const apiKey = process.env.LINEAR_API_KEY;

/**
 * Validates that the Linear API key is present and has the correct format
 * Linear API keys typically start with "lin_api_" followed by a string of alphanumeric characters
 */
export function validateApiKey(apiKey: string | undefined): { valid: boolean; message?: string } {
  if (!apiKey) {
    return { 
      valid: false, 
      message: 'LINEAR_API_KEY environment variable is not set. Please add it to your .env file.' 
    };
  }

  // Basic format check - Linear API keys typically start with "lin_api_" followed by alphanumeric characters
  const linearKeyPattern = /^lin_api_[a-zA-Z0-9]+$/;
  
  if (!linearKeyPattern.test(apiKey)) {
    return { 
      valid: false, 
      message: 'LINEAR_API_KEY has an invalid format. Linear API keys should start with "lin_api_" followed by alphanumeric characters.' 
    };
  }

  return { valid: true };
}

// Create a Linear client instance with the API key
const originalLinearClient = new LinearClient({
  apiKey: apiKey ?? '',
});

/**
 * Type for GraphQL response with data
 */
export interface GraphQLResponse<T = Record<string, unknown>> {
  data: T;
  extensions?: Record<string, unknown>;
}

// Type for raw Linear API response to handle undefined data
interface LinearRawResponse<T> {
  data?: T;
  extensions?: unknown;
}

/**
 * Adapted User type for client use
 * Takes the most essential properties from SDK User type
 */
export type ClientUser = Pick<LinearDocument.User, 'id' | 'name' | 'displayName' | 'email' | 'active' | 'admin' | 'avatarUrl' | 'createdAt' | 'updatedAt' | 'lastSeen'> & {
  organization?: Pick<LinearDocument.Organization, 'id' | 'name' | 'urlKey'>;
  teams?: {
    nodes: Pick<LinearDocument.Team, 'id' | 'name' | 'key'>[];
  };
};

/**
 * Adapted Team type for client use
 */
export type ClientTeam = Pick<LinearDocument.Team, 'id' | 'name' | 'key' | 'description' | 'color' | 'icon' | 'private' | 'createdAt' | 'updatedAt'> & {
  states?: {
    nodes: Pick<LinearDocument.WorkflowState, 'id' | 'name' | 'color' | 'type'>[];
  };
  labels?: {
    nodes: Pick<LinearDocument.IssueLabel, 'id' | 'name' | 'color'>[];
  };
  members?: {
    nodes: Pick<LinearDocument.User, 'id' | 'name' | 'displayName' | 'email'>[];
  };
};

/**
 * Adapted WorkflowState type for client use
 */
export type ClientWorkflowState = Pick<LinearDocument.WorkflowState, 'id' | 'name' | 'color' | 'type'>;

/**
 * Adapted Label type for client use
 */
export type ClientLabel = Pick<LinearDocument.IssueLabel, 'id' | 'name' | 'color'>;

/**
 * Adapted Project type for client use
 */
export type ClientProject = Pick<LinearDocument.Project, 'id' | 'name'>;

/**
 * Adapted Cycle type for client use
 */
export type ClientCycle = Pick<LinearDocument.Cycle, 'id' | 'name' | 'number'>;

/**
 * Interface for a complete Linear Issue
 * Based on the generated Issue type but with simplified structure
 */
export type ClientIssue = Pick<
  LinearDocument.Issue,
  | 'id'
  | 'title'
  | 'description'
  | 'number'
  | 'priority'
  | 'priorityLabel'
  | 'estimate'
  | 'branchName'
  | 'dueDate'
  | 'snoozedUntilAt'
  | 'completedAt'
  | 'canceledAt'
  | 'autoClosedAt'
  | 'archivedAt'
  | 'startedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'boardOrder'
  | 'sortOrder'
  | 'subIssueSortOrder'
> & {
  team?: Pick<LinearDocument.Team, 'id' | 'name' | 'key'>;
  cycle?: Pick<LinearDocument.Cycle, 'id' | 'name' | 'number'>;
  project?: Pick<LinearDocument.Project, 'id' | 'name'>;
  state?: Pick<LinearDocument.WorkflowState, 'id' | 'name' | 'color' | 'type'>;
  labels?: {
    nodes: Pick<LinearDocument.IssueLabel, 'id' | 'name' | 'color'>[];
  };
  assignee?: Pick<LinearDocument.User, 'id' | 'name' | 'displayName' | 'email'>;
  creator?: Pick<LinearDocument.User, 'id' | 'name'>;
  parent?: Pick<LinearDocument.Issue, 'id' | 'title'>;
  children?: {
    nodes: Pick<LinearDocument.Issue, 'id' | 'title'>[];
  };
};

/**
 * Enhanced Linear client with additional GraphQL functionality
 * We use explicit GraphQL queries for better type safety instead of relying on SDK methods
 */
const enhancedClient = {
  // Expose original client for direct SDK access
  client: originalLinearClient.client,
  
  // Helper methods for GraphQL operations
  /**
   * Execute a raw GraphQL query with optional variables
   * @param query The GraphQL query string
   * @param variables Optional variables for the query
   * @returns The parsed response data
   * @throws {LinearError} Standardized error object
   */
  async executeGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>> {
    try {
      const response = await originalLinearClient.client.rawRequest<T, Record<string, unknown>>(query, variables || {});
      return response;
    } catch (error) {
      // Convert to standardized error format
      const linearError = LinearError.fromGraphQLError(error);
      
      // Log error details with context
      logLinearError(linearError, { 
        query, 
        variables,
        operation: 'query'
      });
      
      // Rethrow with standardized format
      throw linearError;
    }
  },
  
  /**
   * Execute a GraphQL mutation with optional variables
   * @param mutation The GraphQL mutation string
   * @param variables Optional variables for the mutation
   * @returns The parsed response data
   * @throws {LinearError} Standardized error object
   */
  async executeGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>> {
    try {
      const response = await originalLinearClient.client.rawRequest<T, Record<string, unknown>>(mutation, variables || {});
      return response;
    } catch (error) {
      // Convert to standardized error format
      const linearError = LinearError.fromGraphQLError(error);
      
      // Log error details with context
      logLinearError(linearError, { 
        query: mutation, 
        variables,
        operation: 'mutation'
      });
      
      // Rethrow with standardized format
      throw linearError;
    }
  },
  
  /**
   * Execute a GraphQL query with built-in error handling
   * Returns a result object instead of throwing exceptions
   * 
   * @param query The GraphQL query string
   * @param variables Optional variables for the query
   * @returns LinearResult object with success/error information
   */
  async safeExecuteGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await this.executeGraphQLQuery<T>(query, variables);
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<T>(error);
      }
      
      // Convert other errors to LinearError
      const linearError = new LinearError(
        error instanceof Error ? error.message : 'Unknown error',
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<T>(linearError);
    }
  },
  
  /**
   * Execute a GraphQL mutation with built-in error handling
   * Returns a result object instead of throwing exceptions
   * 
   * @param mutation The GraphQL mutation string
   * @param variables Optional variables for the mutation
   * @returns LinearResult object with success/error information
   */
  async safeExecuteGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await this.executeGraphQLMutation<T>(mutation, variables);
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<T>(error);
      }
      
      // Convert other errors to LinearError
      const linearError = new LinearError(
        error instanceof Error ? error.message : 'Unknown error',
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<T>(linearError);
    }
  },
  
  /**
   * Execute GraphQL query or mutation with Result pattern instead of exceptions
   * @param query The GraphQL query or mutation string
   * @param variables Optional variables
   * @returns LinearResult object containing either data or error
   */
  async safeExecuteGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await originalLinearClient.client.rawRequest<T, Record<string, unknown>>(query, variables || {});
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      // Convert to standardized error format
      const linearError = LinearError.fromGraphQLError(error);
      
      // Log error details with context
      logLinearError(linearError, { 
        query, 
        variables,
        operation: 'query/mutation'
      });
      
      // Return error result
      return createErrorResult<T>(linearError);
    }
  },
  
  /**
   * Get an issue by ID
   * 
   * @param id The issue ID to retrieve
   * @returns The issue object with all its properties
   * @throws {LinearError} With NOT_FOUND type if issue doesn't exist
   * @throws {LinearError} With VALIDATION type if ID format is invalid
   */
  async _getIssue(id: string): Promise<LinearDocument.Issue> {
    try {
      // 1. Validate parameters
      validateLinearId(id, LinearEntityType.ISSUE);
      
      // 2. Define GraphQL query with all required fields
      const query = `
        query GetIssue($issueId: String!) {
          issue(id: $issueId) {
            id
            title
            description
            number
            priority
            estimate
            branchName
            dueDate
            snoozedUntilAt
            completedAt
            canceledAt
            autoClosedAt
            archivedAt
            startedAt
            subIssueSortOrder
            createdAt
            updatedAt
            url
            boardOrder
            customerTicketCount
            stateOrder
            sortOrder
            previousIdentifiers
            teamId
            cycleId
            projectId
            projectMilestoneId
            parentId
            priorityLabel
            subscribers
            
            # Relationship fields
            labels {
              nodes {
                id
                name
                color
              }
            }
            team {
              id
              name
              key
            }
            state {
              id
              name
              color
              type
            }
            parent {
              id
              title
            }
            project {
              id
              name
            }
            cycle {
              id
              name
              number
            }
            children {
              nodes {
                id
                title
              }
            }
            assignee {
              id
              name
              displayName
              email
            }
            creator {
              id
              name
            }
          }
        }
      `;
      
      // 3. Execute query with variables
      const variables = { issueId: id };
      const result = await this.safeExecuteGraphQLQuery<{ issue: LinearDocument.Issue }>(query, variables);
      
      // 4. Validate response
      if (!result.success || !result.data?.issue) {
        throw new LinearError(
          result.error?.message || `Issue with ID ${id} not found`,
          result.error?.type || LinearErrorType.NOT_FOUND,
          result.error?.originalError
        );
      }
      
      // 5. Return typed data
      return result.data.issue;
    } catch (error) {
      // 6. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 7. Convert other errors to LinearError
      throw new LinearError(
        `Error fetching issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Get an issue by ID with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `getIssue()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * issue or error information.
   *
   * @param id The issue ID to retrieve
   * @returns LinearResult containing either:
   *          - success: true with issue data for valid requests
   *          - success: false with error information for invalid inputs or not found issues
   * @example
   * ```typescript
   * const result = await enhancedClient.safeGetIssue("ISS-123");
   * if (result.success) {
   *   // Use result.data safely
   *   console.log(result.data.title);
   * } else {
   *   // Handle error case
   *   console.error(result.error.userMessage);
   * }
   * ```
   */
  async safeGetIssue(id: string): Promise<LinearResult<LinearDocument.Issue>> {
    try {
      const issue = await this._getIssue(id);
      return createSuccessResult<LinearDocument.Issue>(issue);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.Issue>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeGetIssue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.Issue>(linearError);
    }
  },
  
  /**
   * Create a new issue in Linear
   * 
   * @param input The issue creation input containing required fields like teamId and title
   * @returns The created issue payload containing the issue object and success flag
   * @throws {LinearError} With VALIDATION type if required fields are missing
   * @throws {LinearError} With various types for API errors
   */
  async createIssue(input: LinearDocument.IssueCreateInput): Promise<LinearDocument.IssuePayload> {
    try {
      // 1. Validate required parameters
      if (!input.teamId) {
        throw new LinearError(
          'Team ID is required',
          LinearErrorType.VALIDATION
        );
      }
      
      if (!input.title) {
        throw new LinearError(
          'Title is required',
          LinearErrorType.VALIDATION
        );
      }
      
      // 2. Define GraphQL mutation with all required fields
      const mutation = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              creator {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              cycle {
                id
                name
                number
              }
              parent {
                id
                title
              }
            }
          }
        }
      `;
      
      // 3. Execute mutation with variables
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ issueCreate: LinearDocument.IssuePayload }>(mutation, variables);
      
      // 4. Validate response
      if (!result.success || !result.data?.issueCreate) {
        throw new LinearError(
          result.error?.message || 'Failed to create issue',
          result.error?.type || LinearErrorType.UNKNOWN,
          result.error?.originalError
        );
      }
      
      // 5. Return typed data
      return result.data.issueCreate;
    } catch (error) {
      // 6. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 7. Convert other errors to LinearError
      throw new LinearError(
        `Error creating issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Create a new issue in Linear with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `createIssue()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully created
   * issue payload or error information.
   *
   * @param input The issue creation input
   * @returns LinearResult containing either:
   *          - success: true with issue payload for valid requests
   *          - success: false with error information for invalid inputs or API errors
   * @example
   * ```typescript
   * const result = await enhancedClient.safeCreateIssue({ 
   *   teamId: "team123", 
   *   title: "New Feature" 
   * });
   * if (result.success) {
   *   // Use result.data safely
   *   console.log(result.data.issue.id);
   * } else {
   *   // Handle error case
   *   console.error(result.error.userMessage);
   * }
   * ```
   */
  async safeCreateIssue(input: LinearDocument.IssueCreateInput): Promise<LinearResult<LinearDocument.IssuePayload>> {
    try {
      const result = await this.createIssue(input);
      return createSuccessResult<LinearDocument.IssuePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.IssuePayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeCreateIssue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.IssuePayload>(linearError);
    }
  },

  /**
   * Update an existing issue in Linear
   * 
   * @param id The issue ID to update
   * @param input The issue update input containing fields to update
   * @returns The updated issue payload containing the issue object and success flag
   * @throws {LinearError} With VALIDATION type if ID format is invalid or input is empty
   * @throws {LinearError} With NOT_FOUND type if issue doesn't exist
   * @throws {LinearError} With various types for API errors
   */
  async updateIssue(id: string, input: LinearDocument.IssueUpdateInput): Promise<LinearDocument.IssuePayload> {
    try {
      // 1. Validate the issue ID
      validateLinearId(id, LinearEntityType.ISSUE);
      
      // 2. Validate input - in this case, ensure at least one field is provided
      if (Object.keys(input).length === 0) {
        throw new LinearError(
          'At least one field must be provided for update',
          LinearErrorType.VALIDATION
        );
      }
      
      // 3. Define GraphQL mutation with all required fields
      const mutation = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              creator {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              cycle {
                id
                name
                number
              }
              parent {
                id
                title
              }
            }
          }
        }
      `;
      
      // 4. Execute mutation with variables
      const variables = { id, input };
      const result = await this.safeExecuteGraphQLMutation<{ issueUpdate: LinearDocument.IssuePayload }>(mutation, variables);
      
      // 5. Validate response
      if (!result.success || !result.data?.issueUpdate) {
        throw new LinearError(
          result.error?.message || `Failed to update issue with ID ${id}`,
          result.error?.type || LinearErrorType.UNKNOWN,
          result.error?.originalError
        );
      }
      
      // 6. Return typed data
      return result.data.issueUpdate;
    } catch (error) {
      // 7. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 8. Convert other errors to LinearError
      throw new LinearError(
        `Error updating issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Update an existing issue in Linear with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `updateIssue()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully updated
   * issue payload or error information.
   *
   * @param id The issue ID to update
   * @param input The issue update input containing fields to update
   * @returns LinearResult containing either:
   *          - success: true with issue payload for valid requests
   *          - success: false with error information for invalid inputs, not found issues, or API errors
   * @example
   * ```typescript
   * const result = await enhancedClient.safeUpdateIssue("ISS-123", { 
   *   title: "Updated Title" 
   * });
   * if (result.success) {
   *   // Use result.data safely
   *   console.log(result.data.issue.title);
   * } else {
   *   // Handle error case
   *   console.error(result.error.userMessage);
   * }
   * ```
   */
  async safeUpdateIssue(id: string, input: LinearDocument.IssueUpdateInput): Promise<LinearResult<LinearDocument.IssuePayload>> {
    try {
      const result = await this.updateIssue(id, input);
      return createSuccessResult<LinearDocument.IssuePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.IssuePayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeUpdateIssue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.IssuePayload>(linearError);
    }
  },
  
  /**
   * Fetch multiple issues based on filter criteria
   * 
   * @param filter Optional filter to apply to issues query
   * @param first Maximum number of issues to fetch (default: 50)
   * @param after Cursor for pagination
   * @returns IssueConnection containing nodes and pagination info
   * @throws {LinearError} With VALIDATION type if filter is invalid
   * @throws {LinearError} With various types for API errors
   */
  async issues(filter?: LinearDocument.IssueFilter, first: number = 50, after?: string): Promise<LinearDocument.IssueConnection> {
    try {
      // Define GraphQL query with all required fields
      const query = `
        query GetIssues($filter: IssueFilter, $first: Int, $after: String) {
          issues(filter: $filter, first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
            }
          }
        }
      `;
      
      // Execute query with variables
      const variables = { filter, first, after };
      const result = await this.safeExecuteGraphQLQuery<{ issues: LinearDocument.IssueConnection }>(query, variables);
      
      // Validate response
      if (!result.success || !result.data?.issues) {
        throw new LinearError(
          result.error?.message || 'Failed to fetch issues',
          result.error?.type || LinearErrorType.UNKNOWN,
          result.error?.originalError
        );
      }
      
      // Return typed data
      return result.data.issues;
    } catch (error) {
      // Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError
      throw new LinearError(
        `Error fetching issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Fetch multiple issues with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `issues()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * issues or error information.
   *
   * @param filter Optional filter to apply to issues query
   * @param first Maximum number of issues to fetch (default: 50)
   * @param after Cursor for pagination
   * @returns LinearResult containing either issues data or error information
   */
  async safeIssues(filter?: LinearDocument.IssueFilter, first: number = 50, after?: string): Promise<LinearResult<LinearDocument.IssueConnection>> {
    try {
      const result = await this.issues(filter, first, after);
      return createSuccessResult<LinearDocument.IssueConnection>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.IssueConnection>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeIssues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.IssueConnection>(linearError);
    }
  },

  /**
   * Create a new comment
   * 
   * @param input The comment creation input containing required fields
   * @returns The created comment payload containing the comment object and success flag
   * @throws {LinearError} With VALIDATION type if required fields are missing
   * @throws {LinearError} With various types for API errors
   */
  async createComment(input: LinearDocument.CommentCreateInput): Promise<LinearDocument.CommentPayload> {
    try {
      // 1. Validate required parameters
      if (!input.issueId && !input.documentContentId && !input.projectUpdateId && !input.initiativeUpdateId && !input.postId) {
        throw new LinearError(
          'At least one context ID is required (issueId, documentContentId, etc.)',
          LinearErrorType.VALIDATION
        );
      }
      
      if (!input.body) {
        throw new LinearError(
          'Comment body is required',
          LinearErrorType.VALIDATION
        );
      }
      
      // 2. Validate issueId if provided
      if (input.issueId) {
        validateLinearId(input.issueId, LinearEntityType.ISSUE);
      }
      
      // 3. Define GraphQL mutation with all required fields
      const mutation = `
        mutation CreateComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              editedAt
              createdAt
              updatedAt
              user {
                id
                name
                displayName
              }
              issue {
                id
                title
                identifier
              }
            }
          }
        }
      `;
      
      // 4. Execute mutation with variables
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ commentCreate: LinearDocument.CommentPayload }>(mutation, variables);
      
      // 5. Validate response
      if (!result.success || !result.data?.commentCreate) {
        throw new LinearError(
          result.error?.message || 'Failed to create comment',
          result.error?.type || LinearErrorType.UNKNOWN,
          result.error?.originalError
        );
      }
      
      // 6. Return typed data
      return result.data.commentCreate;
    } catch (error) {
      // 7. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 8. Convert other errors to LinearError
      throw new LinearError(
        `Error creating comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Create a new comment in Linear with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `createComment()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully created
   * comment payload or error information.
   *
   * @param input The comment creation input
   * @returns LinearResult containing either:
   *          - success: true with comment payload for valid requests
   *          - success: false with error information for invalid inputs or API errors
   */
  async safeCreateComment(input: LinearDocument.CommentCreateInput): Promise<LinearResult<LinearDocument.CommentPayload>> {
    try {
      const result = await this.createComment(input);
      return createSuccessResult<LinearDocument.CommentPayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.CommentPayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeCreateComment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.CommentPayload>(linearError);
    }
  },
  
  /**
   * Update an existing comment
   * 
   * @param id The comment ID to update
   * @param input The comment update input containing fields to update
   * @returns The updated comment payload containing the comment object and success flag
   * @throws {LinearError} With VALIDATION type if ID format is invalid or input is empty
   * @throws {LinearError} With NOT_FOUND type if comment doesn't exist
   * @throws {LinearError} With various types for API errors
   */
  async updateComment(id: string, input: LinearDocument.CommentUpdateInput): Promise<LinearDocument.CommentPayload> {
    try {
      // 1. Validate the comment ID
      validateLinearId(id, LinearEntityType.COMMENT);
      
      // 2. Validate input - ensure at least body is provided
      if (!input.body) {
        throw new LinearError(
          'Comment body is required for update',
          LinearErrorType.VALIDATION
        );
      }
      
      // 3. Define GraphQL mutation with all required fields
      const mutation = `
        mutation UpdateComment($id: String!, $input: CommentUpdateInput!) {
          commentUpdate(id: $id, input: $input) {
            success
            comment {
              id
              body
              editedAt
              createdAt
              updatedAt
              user {
                id
                name
                displayName
              }
              issue {
                id
                title
                identifier
              }
            }
          }
        }
      `;
      
      // 4. Execute mutation with variables
      const variables = { id, input };
      const response = await this.executeGraphQLMutation<{ commentUpdate: LinearDocument.CommentPayload }>(mutation, variables);
      
      // 5. Validate response
      if (!response.data || !response.data.commentUpdate) {
        throw new LinearError(
          `Failed to update comment with ID ${id}`,
          LinearErrorType.UNKNOWN
        );
      }
      
      // 6. Return typed data
      return response.data.commentUpdate;
    } catch (error) {
      // 7. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 8. Convert other errors to LinearError
      throw new LinearError(
        `Error updating comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Update an existing comment with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `updateComment()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully updated
   * comment payload or error information.
   *
   * @param id The comment ID to update
   * @param input The comment update input containing fields to update
   * @returns LinearResult containing either:
   *          - success: true with comment payload for valid requests
   *          - success: false with error information for invalid inputs, not found comments, or API errors
   */
  async safeUpdateComment(id: string, input: LinearDocument.CommentUpdateInput): Promise<LinearResult<LinearDocument.CommentPayload>> {
    try {
      const result = await this.updateComment(id, input);
      return createSuccessResult<LinearDocument.CommentPayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.CommentPayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeUpdateComment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.CommentPayload>(linearError);
    }
  },
  
  /**
   * Delete a comment
   * 
   * @param id The comment ID to delete
   * @returns DeletePayload indicating the success of the operation
   * @throws {LinearError} With VALIDATION type if ID format is invalid
   * @throws {LinearError} With NOT_FOUND type if comment doesn't exist
   * @throws {LinearError} With various types for API errors
   */
  async deleteComment(id: string): Promise<LinearDocument.DeletePayload> {
    try {
      // 1. Validate the comment ID
      validateLinearId(id, LinearEntityType.COMMENT);
      
      // 2. Define GraphQL mutation
      const mutation = `
        mutation DeleteComment($id: String!) {
          commentDelete(id: $id) {
            success
            entityId
            lastSyncId
          }
        }
      `;
      
      // 3. Execute mutation with variables
      const variables = { id };
      const response = await this.executeGraphQLMutation<{ commentDelete: LinearDocument.DeletePayload }>(mutation, variables);
      
      // 4. Validate response
      if (!response.data || !response.data.commentDelete) {
        throw new LinearError(
          `Failed to delete comment with ID ${id}`,
          LinearErrorType.UNKNOWN
        );
      }
      
      // 5. Return typed data
      return response.data.commentDelete;
    } catch (error) {
      // 6. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 7. Convert other errors to LinearError
      throw new LinearError(
        `Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Delete a comment with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `deleteComment()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the success payload
   * or error information.
   *
   * @param id The comment ID to delete
   * @returns LinearResult containing either:
   *          - success: true with deletion confirmation for valid requests
   *          - success: false with error information for invalid inputs, not found comments, or API errors
   */
  async safeDeleteComment(id: string): Promise<LinearResult<LinearDocument.DeletePayload>> {
    try {
      const result = await this.deleteComment(id);
      return createSuccessResult<LinearDocument.DeletePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.DeletePayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeDeleteComment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.DeletePayload>(linearError);
    }
  },
  
  /**
   * Create a new issue label
   * 
   * @param input The issue label creation input containing required fields
   * @returns The created issue label payload containing the label object and success flag
   * @throws {LinearError} With VALIDATION type if required fields are missing
   * @throws {LinearError} With various types for API errors
   */
  async createIssueLabel(input: LinearDocument.IssueLabelCreateInput): Promise<LinearDocument.IssueLabelPayload> {
    try {
      // 1. Validate required parameters
      if (!input.name) {
        throw new LinearError(
          'Label name is required',
          LinearErrorType.VALIDATION
        );
      }
      
      if (!input.color) {
        throw new LinearError(
          'Label color is required',
          LinearErrorType.VALIDATION
        );
      }
      
      // 2. Validate teamId if provided
      if (input.teamId) {
        validateLinearId(input.teamId, LinearEntityType.TEAM);
      }
      
      // 3. Define GraphQL mutation with all required fields
      const mutation = `
        mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel {
              id
              name
              color
              description
              isGroup
              createdAt
              updatedAt
              team {
                id
                name
                key
              }
              parent {
                id
                name
              }
            }
            lastSyncId
          }
        }
      `;
      
      // 4. Execute mutation with variables
      const variables = { input };
      const response = await this.executeGraphQLMutation<{ issueLabelCreate: LinearDocument.IssueLabelPayload }>(mutation, variables);
      
      // 5. Validate response
      if (!response.data || !response.data.issueLabelCreate) {
        throw new LinearError(
          'Failed to create issue label',
          LinearErrorType.UNKNOWN
        );
      }
      
      // 6. Return typed data
      return response.data.issueLabelCreate;
    } catch (error) {
      // 7. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 8. Convert other errors to LinearError
      throw new LinearError(
        `Error creating issue label: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Create a new issue label with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `createIssueLabel()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully created
   * issue label payload or error information.
   *
   * @param input The issue label creation input
   * @returns LinearResult containing either:
   *          - success: true with issue label payload for valid requests
   *          - success: false with error information for invalid inputs or API errors
   */
  async safeCreateIssueLabel(input: LinearDocument.IssueLabelCreateInput): Promise<LinearResult<LinearDocument.IssueLabelPayload>> {
    try {
      const result = await this.createIssueLabel(input);
      return createSuccessResult<LinearDocument.IssueLabelPayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.IssueLabelPayload>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeCreateIssueLabel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.IssueLabelPayload>(linearError);
    }
  },
  
  /**
   * Fetch all teams with optional filtering
   * 
   * @param filter Optional filter to apply to teams query
   * @param first Maximum number of teams to fetch (default: 50)
   * @param after Cursor for pagination
   * @param includeArchived Whether to include archived teams (default: false)
   * @returns TeamConnection containing nodes and pagination info
   * @throws {LinearError} With various types for API errors
   */
  async teams(
    filter?: LinearDocument.TeamFilter, 
    first: number = 50, 
    after?: string,
    includeArchived: boolean = false
  ): Promise<LinearDocument.TeamConnection> {
    try {
      // Define GraphQL query with all required fields
      const query = `
        query Teams($filter: TeamFilter, $first: Int, $after: String, $includeArchived: Boolean) {
          teams(filter: $filter, first: $first, after: $after, includeArchived: $includeArchived) {
            nodes {
              id
              name
              key
              description
              color
              icon
              private
              createdAt
              updatedAt
              states {
                nodes {
                  id
                  name
                  color
                  type
                }
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              members {
                nodes {
                  id
                  name
                  displayName
                  email
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;
      
      // Execute query with variables
      const variables = { filter, first, after, includeArchived };
      const response = await this.executeGraphQLQuery<{ teams: LinearDocument.TeamConnection }>(query, variables);
      
      // Validate response
      if (!response.data || !response.data.teams) {
        throw new LinearError(
          'Failed to fetch teams',
          LinearErrorType.UNKNOWN
        );
      }
      
      // Return typed data
      return response.data.teams;
    } catch (error) {
      // Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError
      throw new LinearError(
        `Error fetching teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Fetch all teams with optional filtering and error handling using Result pattern
   * 
   * This method is a non-throwing variant of the `teams()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * teams or error information.
   *
   * @param filter Optional filter to apply to teams query
   * @param first Maximum number of teams to fetch (default: 50)
   * @param after Cursor for pagination
   * @param includeArchived Whether to include archived teams (default: false)
   * @returns LinearResult containing either teams data or error information
   */
  async safeTeams(
    filter?: LinearDocument.TeamFilter, 
    first: number = 50, 
    after?: string,
    includeArchived: boolean = false
  ): Promise<LinearResult<LinearDocument.TeamConnection>> {
    try {
      const result = await this.teams(filter, first, after, includeArchived);
      return createSuccessResult<LinearDocument.TeamConnection>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.TeamConnection>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeTeams: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.TeamConnection>(linearError);
    }
  },
  
  /**
   * Get a team by ID
   * 
   * @param id The team ID to retrieve
   * @returns The team object with all its properties
   * @throws {LinearError} With NOT_FOUND type if team doesn't exist
   * @throws {LinearError} With VALIDATION type if ID format is invalid
   */
  async team(id: string): Promise<LinearDocument.Team> {
    try {
      // 1. Validate parameters
      validateLinearId(id, LinearEntityType.TEAM);
      
      // 2. Define GraphQL query with all required fields
      const query = `
        query GetTeam($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            description
            color
            icon
            private
            createdAt
            updatedAt
            states {
              nodes {
                id
                name
                color
                type
              }
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            members {
              nodes {
                id
                name
                displayName
                email
              }
            }
          }
        }
      `;
      
      // 3. Execute query with variables
      const variables = { teamId: id };
      const response = await this.executeGraphQLQuery<{ team: LinearDocument.Team }>(query, variables);
      
      // 4. Validate response
      if (!response.data || !response.data.team) {
        throw new LinearError(
          `Team with ID ${id} not found`,
          LinearErrorType.NOT_FOUND
        );
      }
      
      // 5. Return typed data
      return response.data.team;
    } catch (error) {
      // 6. Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // 7. Convert other errors to LinearError
      throw new LinearError(
        `Error fetching team: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Get a team by ID with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `team()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * team or error information.
   *
   * @param id The team ID to retrieve
   * @returns LinearResult containing either:
   *          - success: true with team data for valid requests
   *          - success: false with error information for invalid inputs or not found teams
   */
  async safeTeam(id: string): Promise<LinearResult<LinearDocument.Team>> {
    try {
      const team = await this.team(id);
      return createSuccessResult<LinearDocument.Team>(team);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.Team>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeTeam: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.Team>(linearError);
    }
  },
  
  /**
   * Get the current authenticated user's profile
   * 
   * @returns The user object with all its properties
   * @throws {LinearError} With AUTHENTICATION type if the user is not authenticated
   * @throws {LinearError} With various types for API errors
   */
  async getViewer(): Promise<LinearDocument.User> {
    try {
      // Define GraphQL query with all required fields
      const query = `
        query Viewer {
          viewer {
            id
            name
            displayName
            email
            active
            admin
            avatarUrl
            createdAt
            updatedAt
            lastSeen
            organizationId
            organization {
              id
              name
              urlKey
            }
            teams {
              nodes {
                id
                name
                key
              }
            }
          }
        }
      `;
      
      // Execute query
      const result = await this.safeExecuteGraphQLQuery<{ viewer: LinearDocument.User }>(query);
      
      // Validate response
      if (!result.success || !result.data?.viewer) {
        throw new LinearError(
          result.error?.message || 'Failed to fetch viewer profile',
          result.error?.type || LinearErrorType.AUTHENTICATION,
          result.error?.originalError
        );
      }
      
      // Return typed data
      return result.data.viewer;
    } catch (error) {
      // Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError
      throw new LinearError(
        `Error fetching viewer profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },
  
  /**
   * Get the current authenticated user's profile with error handling using the Result pattern
   * 
   * This method is a non-throwing variant of the `getViewer()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * user or error information.
   *
   * @returns LinearResult containing either:
   *          - success: true with user data for valid requests
   *          - success: false with error information for authentication or API errors
   */
  async safeGetViewer(): Promise<LinearResult<LinearDocument.User>> {
    try {
      const user = await this.getViewer();
      return createSuccessResult<LinearDocument.User>(user);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.User>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeGetViewer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<LinearDocument.User>(linearError);
    }
  },

  /**
   * Fetches a specific cycle by ID
   * 
   * @param id The ID of the cycle to fetch
   * @returns The cycle data
   * @throws {LinearError} Standardized error for API or validation failures
   */
  async cycle(id: string): Promise<LinearDocument.Cycle> {
    // Validate cycle ID
    if (!id || id.trim() === '') {
      throw new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
    }
    
    try {
      // Validate ID format
      validateLinearId(id, LinearEntityType.CYCLE);
      
      // Define the GraphQL query for fetching a cycle by ID
      const query = `
        query GetCycle($id: ID!) {
          cycle(id: $id) {
            id
            name
            number
            startsAt
            endsAt
            completedAt
            description
            team {
              id
              name
              key
            }
            issues {
              nodes {
                id
                identifier
                title
              }
            }
          }
        }
      `;
      
      // Execute the query with the cycle ID
      const response = await this.executeGraphQLQuery<{ cycle: LinearDocument.Cycle }>(query, { id });
      
      // Check if cycle was found
      if (!response.data || !response.data.cycle) {
        throw new LinearError(
          `Cycle with ID ${id} not found`,
          LinearErrorType.NOT_FOUND,
          undefined
        );
      }
      
      return response.data.cycle;
    } catch (error) {
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError format
      throw new LinearError(
        `Failed to fetch cycle with ID ${id}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },

  /**
   * Safely fetches a specific cycle by ID with error handling
   * 
   * @param id The ID of the cycle to fetch
   * @returns LinearResult containing cycle data or error information
   */
  async safeCycle(id: string): Promise<LinearResult<LinearDocument.Cycle>> {
    try {
      const cycle = await this.cycle(id);
      return createSuccessResult<LinearDocument.Cycle>(cycle);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.Cycle>(error);
      }
      return createErrorResult<LinearDocument.Cycle>(
        new LinearError('Failed to fetch cycle', LinearErrorType.UNKNOWN, error)
      );
    }
  },

  /**
   * Fetches cycles with optional filtering
   * 
   * @param filter Optional filter criteria for cycles
   * @param first Number of cycles to fetch (default: 50)
   * @param after Cursor for pagination
   * @param includeArchived Whether to include archived cycles (default: false)
   * @returns Connection object with cycle nodes
   * @throws {LinearError} Standardized error for API or validation failures
   */
  async cycles(
    filter?: LinearDocument.CycleFilter, 
    first: number = 50, 
    after?: string,
    includeArchived: boolean = false
  ): Promise<LinearDocument.CycleConnection> {
    try {
      // Define the GraphQL query for fetching cycles
      const query = `
        query GetCycles($filter: CycleFilter, $first: Int, $after: String, $includeArchived: Boolean) {
          cycles(filter: $filter, first: $first, after: $after, includeArchived: $includeArchived) {
            nodes {
              id
              name
              number
              startsAt
              endsAt
              completedAt
              description
              team {
                id
                name
                key
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      
      // Execute the query with filter parameters
      const response = await this.executeGraphQLQuery<{ cycles: LinearDocument.CycleConnection }>(
        query, 
        { filter, first, after, includeArchived }
      );
      
      // Check if cycles data exists
      if (!response.data || !response.data.cycles) {
        throw new LinearError(
          'Failed to fetch cycles',
          LinearErrorType.UNKNOWN,
          undefined
        );
      }
      
      return response.data.cycles;
    } catch (error) {
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError format
      throw new LinearError(
        'Failed to fetch cycles',
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },

  /**
   * Safely fetches cycles with optional filtering
   * 
   * @param filter Optional filter criteria for cycles
   * @param first Number of cycles to fetch (default: 50)
   * @param after Cursor for pagination
   * @param includeArchived Whether to include archived cycles (default: false)
   * @returns LinearResult containing cycles data or error information
   */
  async safeCycles(
    filter?: LinearDocument.CycleFilter, 
    first: number = 50, 
    after?: string,
    includeArchived: boolean = false
  ): Promise<LinearResult<LinearDocument.CycleConnection>> {
    try {
      const cycles = await this.cycles(filter, first, after, includeArchived);
      return createSuccessResult<LinearDocument.CycleConnection>(cycles);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.CycleConnection>(error);
      }
      return createErrorResult<LinearDocument.CycleConnection>(
        new LinearError('Failed to fetch cycles', LinearErrorType.UNKNOWN, error)
      );
    }
  },

  /**
   * Creates a new cycle
   * 
   * @param input Cycle creation parameters
   * @returns CyclePayload containing the created cycle
   * @throws {LinearError} Standardized error for API or validation failures
   */
  async createCycle(input: LinearDocument.CycleCreateInput): Promise<LinearDocument.CyclePayload> {
    // Validate required inputs
    if (!input.teamId) {
      throw new LinearError(
        'Team ID is required to create a cycle',
        LinearErrorType.VALIDATION,
        undefined
      );
    }
    
    try {
      // Validate ID format
      if (input.teamId) {
        validateLinearId(input.teamId, LinearEntityType.TEAM);
      }
      
      // Define the GraphQL mutation for creating a cycle
      const mutation = `
        mutation CreateCycle($input: CycleCreateInput!) {
          cycleCreate(input: $input) {
            success
            cycle {
              id
              name
              number
              startsAt
              endsAt
              completedAt
              description
              team {
                id
                name
                key
              }
            }
          }
        }
      `;
      
      // Execute the mutation with the input data
      const response = await this.executeGraphQLMutation<{ cycleCreate: LinearDocument.CyclePayload }>(
        mutation, 
        { input }
      );
      
      // Check if cycle creation was successful
      if (!response.data || !response.data.cycleCreate) {
        throw new LinearError(
          'Failed to create cycle',
          LinearErrorType.UNKNOWN,
          undefined
        );
      }
      
      return response.data.cycleCreate;
    } catch (error) {
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError format
      throw new LinearError(
        'Failed to create cycle',
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },

  /**
   * Safely creates a new cycle with error handling
   * 
   * @param input Cycle creation parameters
   * @returns LinearResult containing the created cycle or error information
   */
  async safeCreateCycle(input: LinearDocument.CycleCreateInput): Promise<LinearResult<LinearDocument.CyclePayload>> {
    try {
      const result = await this.createCycle(input);
      return createSuccessResult<LinearDocument.CyclePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.CyclePayload>(error);
      }
      return createErrorResult<LinearDocument.CyclePayload>(
        new LinearError('Failed to create cycle', LinearErrorType.UNKNOWN, error)
      );
    }
  },

  /**
   * Updates an existing cycle
   * 
   * @param id ID of the cycle to update
   * @param input Cycle update parameters
   * @returns CyclePayload containing the updated cycle
   * @throws {LinearError} Standardized error for API or validation failures
   */
  async updateCycle(id: string, input: LinearDocument.CycleUpdateInput): Promise<LinearDocument.CyclePayload> {
    // Validate cycle ID
    if (!id || id.trim() === '') {
      throw new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
    }
    
    try {
      // Validate ID format
      validateLinearId(id, LinearEntityType.CYCLE);
      
      // Define the GraphQL mutation for updating a cycle
      const mutation = `
        mutation UpdateCycle($id: ID!, $input: CycleUpdateInput!) {
          cycleUpdate(id: $id, input: $input) {
            success
            cycle {
              id
              name
              number
              startsAt
              endsAt
              completedAt
              description
              team {
                id
                name
                key
              }
            }
          }
        }
      `;
      
      // Execute the mutation with cycle ID and input data
      const response = await this.executeGraphQLMutation<{ cycleUpdate: LinearDocument.CyclePayload }>(
        mutation, 
        { id, input }
      );
      
      // Check if cycle update was successful
      if (!response.data || !response.data.cycleUpdate) {
        throw new LinearError(
          `Failed to update cycle with ID ${id}`,
          LinearErrorType.UNKNOWN,
          undefined
        );
      }
      
      return response.data.cycleUpdate;
    } catch (error) {
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError format
      throw new LinearError(
        `Failed to update cycle with ID ${id}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },

  /**
   * Safely updates an existing cycle with error handling
   * 
   * @param id ID of the cycle to update
   * @param input Cycle update parameters
   * @returns LinearResult containing the updated cycle or error information
   */
  async safeUpdateCycle(id: string, input: LinearDocument.CycleUpdateInput): Promise<LinearResult<LinearDocument.CyclePayload>> {
    try {
      const result = await this.updateCycle(id, input);
      return createSuccessResult<LinearDocument.CyclePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.CyclePayload>(error);
      }
      return createErrorResult<LinearDocument.CyclePayload>(
        new LinearError(`Failed to update cycle with ID ${id}`, LinearErrorType.UNKNOWN, error)
      );
    }
  },

  /**
   * Adds an issue to a cycle
   * 
   * @param issueId ID of the issue to add
   * @param cycleId ID of the cycle to add the issue to
   * @returns IssuePayload containing the updated issue
   * @throws {LinearError} Standardized error for API or validation failures
   */
  async addIssueToCycle(issueId: string, cycleId: string): Promise<LinearDocument.IssuePayload> {
    // Validate IDs
    if (!issueId || issueId.trim() === '') {
      throw new LinearError(
        'Issue ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
    }
    
    if (!cycleId || cycleId.trim() === '') {
      throw new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
    }
    
    try {
      // Validate ID formats
      validateLinearId(issueId, LinearEntityType.ISSUE);
      validateLinearId(cycleId, LinearEntityType.CYCLE);
      
      // Define the GraphQL mutation for adding an issue to a cycle
      const mutation = `
        mutation AddIssueToCycle($issueId: ID!, $cycleId: ID!) {
          issueUpdate(id: $issueId, input: { cycleId: $cycleId }) {
            success
            issue {
              id
              identifier
              title
              cycle {
                id
                name
                number
                startsAt
                endsAt
              }
            }
          }
        }
      `;
      
      // Execute the mutation with issue ID and cycle ID
      const response = await this.executeGraphQLMutation<{ issueUpdate: LinearDocument.IssuePayload }>(
        mutation, 
        { issueId, cycleId }
      );
      
      // Check if update was successful
      if (!response.data || !response.data.issueUpdate) {
        throw new LinearError(
          'Failed to add issue to cycle',
          LinearErrorType.UNKNOWN,
          undefined
        );
      }
      
      return response.data.issueUpdate;
    } catch (error) {
      if (error instanceof LinearError) {
        throw error;
      }
      
      // Convert other errors to LinearError format
      throw new LinearError(
        'Failed to add issue to cycle',
        LinearErrorType.UNKNOWN,
        error
      );
    }
  },

  /**
   * Safely adds an issue to a cycle with error handling
   * 
   * @param issueId ID of the issue to add
   * @param cycleId ID of the cycle to add the issue to
   * @returns LinearResult containing the updated issue or error information
   */
  async safeAddIssueToCycle(issueId: string, cycleId: string): Promise<LinearResult<LinearDocument.IssuePayload>> {
    try {
      const result = await this.addIssueToCycle(issueId, cycleId);
      return createSuccessResult<LinearDocument.IssuePayload>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<LinearDocument.IssuePayload>(error);
      }
      return createErrorResult<LinearDocument.IssuePayload>(
        new LinearError('Failed to add issue to cycle', LinearErrorType.UNKNOWN, error)
      );
    }
  },

  /**
   * Test authentication with Linear API
   * This function performs a simple GraphQL query to verify the API key is valid
   * @returns Result indicating success or failure with detailed error information
   */
  async testAuthentication(): Promise<LinearResult<Record<string, unknown>>> {
    try {
      // Simple GraphQL query to verify auth
      const query = `query { viewer { email } }`;
      const result = await this.safeExecuteGraphQLQuery<Record<string, unknown>>(query);
      
      return result;
    } catch (error) {
      // This is a fallback in case safeExecuteGraphQLQuery throws (it shouldn't)
      if (error instanceof LinearError) {
        return createErrorResult<Record<string, unknown>>(error);
      }
      
      const linearError = new LinearError(
        error instanceof Error ? error.message : 'Unknown authentication error',
        LinearErrorType.AUTHENTICATION,
        error
      );
      
      return createErrorResult<Record<string, unknown>>(linearError);
    }
  }
};

// Export enhancedClient both as named and default export
// Note: There are some TypeScript incompatibilities between our types and the SDK types
// We're using 'any' casts in places to bridge these gaps, but GraphQL operations
// provide better type safety through our safeExecuteGraphQL methods
export { enhancedClient };
export default enhancedClient;
