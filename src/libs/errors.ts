/**
 * Linear API Error Handling
 * 
 * This module provides standardized error types and handlers for Linear API interactions.
 */

/**
 * Standardized error types for Linear API errors
 */
export enum LinearErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

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
    type: LinearErrorType = LinearErrorType.UNKNOWN,
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
      case LinearErrorType.AUTHENTICATION:
        return `Authentication failed. Please check your Linear API key configuration.`;
      
      case LinearErrorType.PERMISSION:
        return `Permission denied. Your API key lacks permission for this operation.`;
      
      case LinearErrorType.NOT_FOUND:
        return `Resource not found in Linear. Please check the ID or reference is correct.`;
      
      case LinearErrorType.RATE_LIMIT:
        return `Rate limit exceeded. Please wait ${this.retryAfter || 60} seconds before retrying.`;
      
      case LinearErrorType.VALIDATION:
        return `Validation error with Linear API request. ${this.message}`;
      
      case LinearErrorType.NETWORK:
        return `Network error when contacting Linear API. Please check your connection.`;
      
      case LinearErrorType.UNKNOWN:
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
        LinearErrorType.UNKNOWN
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
        LinearErrorType.AUTHENTICATION,
        error,
        status
      );
    }
    
    if (status === 403) {
      return new LinearError(
        'Permission denied. Your API key lacks permission for this operation.',
        LinearErrorType.PERMISSION,
        error,
        status
      );
    }
    
    if (status === 404) {
      return new LinearError(
        'Resource not found in Linear.',
        LinearErrorType.NOT_FOUND,
        error,
        status
      );
    }
    
    if (status === 429) {
      // Extract retry-after header if available
      const retryAfter = parseInt(response?.headers?.['retry-after'] || '60', 10);
      return new LinearError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        LinearErrorType.RATE_LIMIT,
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
          LinearErrorType.NOT_FOUND,
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
          LinearErrorType.PERMISSION,
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
          LinearErrorType.RATE_LIMIT,
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
          LinearErrorType.VALIDATION,
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
          LinearErrorType.AUTHENTICATION,
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
        LinearErrorType.UNKNOWN,
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
        LinearErrorType.NETWORK,
        error
      );
    }
    
    // Fallback for any other errors
    return new LinearError(
      errorObj.message || 'Unknown error occurred with Linear API',
      LinearErrorType.UNKNOWN,
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