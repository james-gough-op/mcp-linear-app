import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';
import {
  LinearError,
  LinearErrorType,
  LinearResult,
  createErrorResult,
  createSuccessResult,
  logLinearError
} from './errors.js';

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
  }
};
