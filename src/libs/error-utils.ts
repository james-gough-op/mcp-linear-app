import { LinearErrorType } from '@linear/sdk';
import { LinearError } from './errors.js';

/**
 * Standard MCP response type that matches the tool handler return type
 */
export type McpResponse = {
  content: [{
    type: "text";
    text: string;
  }];
  isError: boolean;
};

/**
 * Error categories for categorizing errors with prefixes
 */
export enum ErrorCategory {
  Validation = 'Validation error',
  Authentication = 'Authentication error',
  Authorization = 'Permission denied',
  NotFound = 'Not found',
  Api = 'API error',
  Network = 'Network error',
  Unexpected = 'Unexpected error'
}

/**
 * Maps Linear error types to our error categories
 */
function mapErrorTypeToCategory(errorType: LinearErrorType): ErrorCategory {
  switch (errorType) {
    case "AuthenticationError" as LinearErrorType:
      return ErrorCategory.Authentication;
    case "Forbidden" as LinearErrorType:
      return ErrorCategory.Authorization;
    case "InvalidInput" as LinearErrorType:
      return ErrorCategory.Validation;
    case "FeatureNotAccessible" as LinearErrorType:
    case "UserError" as LinearErrorType:
      return ErrorCategory.NotFound;
    case "Ratelimited" as LinearErrorType:
    case "GraphqlError" as LinearErrorType:
    case "LockTimeout" as LinearErrorType:
    case "InternalError" as LinearErrorType:
    case "BootstrapError" as LinearErrorType:
      return ErrorCategory.Api;
    case "NetworkError" as LinearErrorType:
      return ErrorCategory.Network;
    case "Unknown" as LinearErrorType:
    case "Other" as LinearErrorType:
    default:
      return ErrorCategory.Unexpected;
  }
}

/**
 * Formats a LinearError into a standardized error response
 * 
 * @param error The LinearError object from the enhanced client
 * @returns A standardized MCP response with formatted error message
 */
export function formatErrorResponse(error?: LinearError): McpResponse {
  if (!error) {
    return {
      content: [{
        type: "text",
        text: `Error: An unknown error occurred. Please try again later.`
      }],
      isError: true
    };
  }

  const category = mapErrorTypeToCategory(error.type);

  // Standardized messages for each category
  let text = '';
  switch (category) {
    case ErrorCategory.Authentication:
      text = `Error: Authentication error: Please check your Linear API key. Authentication failed.`;
      break;
    case ErrorCategory.Authorization:
      text = `Error: Permission denied: Please check your account permissions.`;
      break;
    case ErrorCategory.Validation:
      text = `Error: Validation error: Invalid input.`;
      break;
    case ErrorCategory.NotFound:
      text = `Error: Not found: Resource not found.`;
      break;
    case ErrorCategory.Network:
      text = `Error: Network error: Unable to connect to Linear API. Please check your internet connection.`;
      break;
    case ErrorCategory.Unexpected:
      text = `Error: Unexpected error: An unexpected error occurred. Please try again later.`;
      break;
    case ErrorCategory.Api:
      text = `Error: API error: An error occurred while communicating with Linear.`;
      break;
    default:
      text = `Error: An unknown error occurred. Please try again later.`;
  }

  // Optionally append the SDK error message if it adds value
  if (error.message && !text.includes(error.message)) {
    text += ` ${error.message}`;
  }

  return {
    content: [{
      type: "text",
      text
    }],
    isError: true
  };
}

/**
 * Format a validation error for a specific field
 * 
 * @param field The field that has a validation error
 * @param message The validation error message
 * @param simplifiedFormat Whether to use a simplified format without the field name prefix
 * @returns A standardized MCP response with validation error message
 */
export function formatValidationError(field: string, message: string, simplifiedFormat = false): McpResponse {
  return {
    content: [{
      type: "text",
      text: simplifiedFormat 
        ? `Error: ${message}` 
        : `Error: Validation error: ${field}: ${message}`
    }],
    isError: true
  };
}

/**
 * Format a generic error message
 * 
 * @param message Optional custom error message
 * @returns A standardized MCP response with generic error message
 */
export function formatGenericErrorResponse(message?: string): McpResponse {
  return {
    content: [{
      type: "text",
      text: `Error: ${message || 'An error occurred while processing your request. Please try again later.'}`
    }],
    isError: true
  };
}

/**
 * Format a caught exception into a standardized error response
 * 
 * @param error The caught error
 * @returns A standardized MCP response with error message from exception
 */
export function formatCatchErrorResponse(error: unknown): McpResponse {
  if (error instanceof LinearError) {
    return formatErrorResponse(error);
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  return {
    content: [{
      type: "text",
      text: `Error: Unexpected error: ${errorMessage}`
    }],
    isError: true
  };
} 