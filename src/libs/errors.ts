/**
 * Linear API Error Handling
 * 
 * This module provides standardized error types and handlers for Linear API interactions.
 */

import { LinearErrorType } from '@linear/sdk'; // Re-import from SDK

/**
 * Standardized error class for Linear API errors
 */
export class LinearError extends Error {
  /**
   * The type of error that occurred
   */
  type: LinearErrorType;
  
  /**
   * The original error object (for debugging)
   */
  originalError?: unknown;
  
  /**
   * HTTP status code (if applicable)
   */
  status?: number;
  
  /**
   * Time in seconds to wait before retrying (for rate limit errors)
   */
  retryAfter?: number;
  
  /**
   * GraphQL path where the error occurred (if available)
   */
  path?: string[];
  
  /**
   * Error codes from Linear API (if available)
   */
  code?: string;
  
  constructor(
    message: string, 
    type: LinearErrorType = "Unknown" as LinearErrorType,
    originalError?: unknown,
    status?: number,
    retryAfter?: number,
    path?: string[],
    code?: string
  ) {
    super(message);
    this.name = 'LinearError';
    this.type = type;
    this.originalError = originalError;
    this.status = status;
    this.retryAfter = retryAfter;
    this.path = path;
    this.code = code;
  }
  
  /**
   * Create a user-friendly error message with recommended action
   */
  get userMessage(): string {
    switch (this.type) {
      case "AuthenticationError" as LinearErrorType:
        return `Authentication failed. Please check your Linear API key configuration.`;
      
      case "Forbidden" as LinearErrorType:
        return `Permission denied. Your API key lacks permission for this operation.`;
      
      case "FeatureNotAccessible" as LinearErrorType:
        return `Resource not found in Linear. Please check the ID or reference is correct.`;
      
      case "Ratelimited" as LinearErrorType:
        return `Rate limit exceeded. Please wait ${this.retryAfter || 60} seconds before retrying.`;
      
      case "InvalidInput" as LinearErrorType: 
        return `Validation error with Linear API request. ${this.message}`;
      
      case "NetworkError" as LinearErrorType:
        return `Network error when contacting Linear API. Please check your connection.`;
      
      case "UserError" as LinearErrorType:
        return `User error with Linear API request. ${this.message}`;

      case "InternalError" as LinearErrorType:
        return `Internal error with Linear API. Please contact support.`;
      
      case "GraphqlError" as LinearErrorType:
        return `GraphQL error with Linear API request. ${this.message}`;
      
      case "LockTimeout" as LinearErrorType:
        return `Lock timeout with Linear API request. Please try again later.`;
      
      case "BootstrapError" as LinearErrorType:
        return `Bootstrap error with Linear API. Please contact support.`;
      
      case "Unknown" as LinearErrorType:
      case "Other" as LinearErrorType:
      default:
        return `An error occurred with the Linear API: ${this.message}`;
    }
  }
  
  /**
   * Parse a raw error from Linear GraphQL API into a standardized LinearError
   */
  static fromGraphQLError(error: unknown): LinearError {
    if (!error) {
      return new LinearError(
        'Unknown error occurred with Linear API',
        "Unknown" as LinearErrorType
      );
    }
    
    // Type narrowing 
    const errorObj = error as {
      response?: {
        status?: number;
        headers?: Record<string, string>;
        errors?: Array<{
          message?: string;
          path?: string[];
          extensions?: {
            code?: string;
            type?: string;
            statusCode?: number;
          };
        }>;
      };
      request?: unknown;
      message?: string;
    };
    
    const response = errorObj.response;
    const status = response?.status;
    
    // Check for HTTP status code errors first
    if (status === 401) {
      return new LinearError(
        'Authentication failed. Please check your Linear API key.',
        "AuthenticationError" as LinearErrorType,
        error,
        status
      );
    }
    
    if (status === 403) {
      return new LinearError(
        'Permission denied. Your API key lacks permission for this operation.',
        "Forbidden" as LinearErrorType,
        error,
        status
      );
    }
    
    if (status === 404) {
      return new LinearError(
        'Resource not found in Linear.',
        "FeatureNotAccessible" as LinearErrorType,
        error,
        status
      );
    }
    
    if (status === 429) {
      // Extract retry-after header if available
      const retryAfter = parseInt(response?.headers?.['retry-after'] || '60', 10);
      return new LinearError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        "Ratelimited" as LinearErrorType,
        error,
        status,
        retryAfter
      );
    }
    
    // Parse GraphQL errors from response body
    const graphQLErrors = response?.errors || [];
    if (graphQLErrors.length > 0) {
      // Extract the main error (first in the array)
      const mainError = graphQLErrors[0];
      const errorMessage = mainError.message || 'Unknown GraphQL error';
      const errorPath = mainError.path;
      const errorCode = mainError.extensions?.code;
      const errorType = mainError.extensions?.type;
      const statusCode = mainError.extensions?.statusCode || status;
      
      // Determine error type based on message content and extensions
      if (errorMessage.includes('not found') || 
          errorMessage.includes('does not exist') ||
          errorType === 'NOT_FOUND' ||
          errorCode === 'NOT_FOUND') {
        return new LinearError(
          errorMessage,
          "FeatureNotAccessible" as LinearErrorType,
          error,
          statusCode,
          undefined,
          errorPath,
          errorCode
        );
      }
      
      if (errorMessage.includes('not authorized') ||
          errorMessage.includes('permission') ||
          errorType === 'PERMISSION' ||
          errorCode === 'FORBIDDEN') {
        return new LinearError(
          errorMessage,
          "Forbidden" as LinearErrorType,
          error,
          statusCode,
          undefined,
          errorPath,
          errorCode
        );
      }
      
      if (errorMessage.includes('rate limit') ||
          errorType === 'RATE_LIMIT' ||
          errorCode === 'RATE_LIMITED') {
        // Parse retry-after from error message if available
        const retryMatch = errorMessage.match(/(\d+)\s*seconds?/);
        const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 60;
        
        return new LinearError(
          errorMessage,
          "Ratelimited" as LinearErrorType,
          error,
          statusCode,
          retryAfter,
          errorPath,
          errorCode
        );
      }
      
      if (errorType === 'VALIDATION' || 
          errorCode === 'BAD_REQUEST' ||
          errorCode === 'GRAPHQL_VALIDATION_FAILED' ||
          errorCode === 'GRAPHQL_PARSE_FAILED') {
        return new LinearError(
          errorMessage,
          "InvalidInput" as LinearErrorType,
          error,
          statusCode,
          undefined,
          errorPath,
          errorCode
        );
      }
      
      // Authentication errors from GraphQL responses
      if (errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized') ||
          errorType === 'AUTHENTICATION' ||
          errorCode === 'UNAUTHENTICATED') {
        return new LinearError(
          errorMessage,
          "AuthenticationError" as LinearErrorType,
          error,
          statusCode,
          undefined,
          errorPath,
          errorCode
        );
      }
      
      // Default to unknown for other GraphQL errors
      return new LinearError(
        errorMessage,
        "Unknown" as LinearErrorType,
        error,
        statusCode,
        undefined,
        errorPath,
        errorCode
      );
    }
    
    // Network or other unknown errors
    if (errorObj.request && !errorObj.response) {
      return new LinearError(
        'Network error when contacting Linear API.',
          "NetworkError" as LinearErrorType,
        error
      );
    }
    
    // Fallback for any other errors
    return new LinearError(
      errorObj.message || 'Unknown error occurred with Linear API',
      "Unknown" as LinearErrorType,
      error
    );
  }
}

/**
 * Log a Linear API error with consistent formatting
 */
export function logLinearError(error: LinearError, context?: Record<string, unknown>): void {
  const logData = {
    type: error.type,
    message: error.message,
    userMessage: error.userMessage,
    status: error.status,
    path: error.path,
    code: error.code,
    retryAfter: error.retryAfter,
    context
  };
  
  console.error(`Linear API Error [${error.type}]: ${error.message}`, logData);
}

/**
 * A typed result object for Linear API operations that might fail
 */
export interface LinearResult<T> {
  success: boolean;
  data?: T;
  error?: LinearError;
}

/**
 * Create a successful result
 */
export function createSuccessResult<T>(data: T): LinearResult<T> {
  return {
    success: true,
    data
  };
}

/**
 * Create an error result
 */
export function createErrorResult<T>(error: LinearError): LinearResult<T> {
  return {
    success: false,
    error
  };
} 