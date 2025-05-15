import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';
import type {
  Cycle as LinearCycle,
  Issue as LinearIssue,
  IssueLabel as LinearLabel,
  Project as LinearProject,
  Team as LinearTeam,
  User as LinearUser,
  WorkflowState as LinearWorkflowState
} from '../generated/linear-types.js';
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
const linearClient = new LinearClient({
  apiKey: apiKey ?? '',
});

// Export default client for use in other modules
export default linearClient;

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
 * Takes the most essential properties from LinearUser
 */
export type User = Pick<LinearUser, 'id' | 'name' | 'displayName' | 'email'>;

/**
 * Adapted Team type for client use
 */
export type Team = Pick<LinearTeam, 'id' | 'name' | 'key'>;

/**
 * Adapted WorkflowState type for client use
 */
export type WorkflowState = Pick<LinearWorkflowState, 'id' | 'name' | 'color' | 'type'>;

/**
 * Adapted Label type for client use
 */
export type Label = Pick<LinearLabel, 'id' | 'name' | 'color'>;

/**
 * Adapted Project type for client use
 */
export type Project = Pick<LinearProject, 'id' | 'name'>;

/**
 * Adapted Cycle type for client use
 */
export type Cycle = Pick<LinearCycle, 'id' | 'name' | 'number'>;

/**
 * Interface for a complete Linear Issue
 * Based on the generated LinearIssue type but with simplified structure
 */
export type Issue = Pick<
  LinearIssue,
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
  | 'team'
  | 'cycle'
  | 'project'
  | 'projectMilestone'
  | 'parent'
  | 'subscribers'
>;


/**
 * Enhanced Linear client with additional GraphQL functionality
 */
export const enhancedClient = {
  ...linearClient,
  
  /**
   * Execute a raw GraphQL query with optional variables
   * @param query The GraphQL query string
   * @param variables Optional variables for the query
   * @returns The parsed response data
   * @throws {LinearError} Standardized error object
   */
  async executeGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>> {
    try {
      const response = await linearClient.client.rawRequest<T, Record<string, unknown>>(query, variables || {});
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
      const response = await linearClient.client.rawRequest<T, Record<string, unknown>>(mutation, variables || {});
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
      const response = await linearClient.client.rawRequest<T, Record<string, unknown>>(query, variables || {});
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
  },
  
  /**
   * Get an issue by ID
   * 
   * @param id The issue ID to retrieve
   * @returns The issue object with all its properties
   * @throws {LinearError} With NOT_FOUND type if issue doesn't exist
   * @throws {LinearError} With VALIDATION type if ID format is invalid
   */
  async issue(id: string): Promise<Issue> {
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
      const response = await this.executeGraphQLQuery<{ issue: Issue }>(query, variables);
      
      // 4. Validate response
      if (!response.data || !response.data.issue) {
        throw new LinearError(
          `Issue with ID ${id} not found`,
          LinearErrorType.NOT_FOUND
        );
      }
      
      // 5. Return typed data
      return response.data.issue;
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
   * This method is a non-throwing variant of the `issue()` method. Instead of throwing
   * exceptions, it returns a Result object that contains either the successfully retrieved
   * issue or error information.
   *
   * @param id The issue ID to retrieve
   * @returns LinearResult containing either:
   *          - success: true with issue data for valid requests
   *          - success: false with error information for invalid inputs or not found issues
   * @example
   * ```typescript
   * const result = await enhancedClient.safeIssue("ISS-123");
   * if (result.success) {
   *   // Use result.data safely
   *   console.log(result.data.title);
   * } else {
   *   // Handle error case
   *   console.error(result.error.userMessage);
   * }
   * ```
   */
  async safeIssue(id: string): Promise<LinearResult<Issue>> {
    try {
      const issue = await this.issue(id);
      return createSuccessResult<Issue>(issue);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<Issue>(error);
      }
      
      const linearError = new LinearError(
        `Error in safeIssue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<Issue>(linearError);
    }
  }
};
