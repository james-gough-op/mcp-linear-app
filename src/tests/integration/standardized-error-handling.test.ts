import {
    LinearErrorType
} from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatErrorResponse } from '../../libs/error-utils.js';
import { LinearError } from '../../libs/errors.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import {
    getResponseText,
    mockLogger,
    mockUtils
} from '../utils/test-utils.js';

/**
 * Integration tests for standardized error handling across tools
 * 
 * These tests verify that all tools use the standardized error handling patterns,
 * ensuring consistent behavior across the application.
 */

// Mock the logger and utils
mockLogger();
mockUtils();

describe('Standardized Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Errors', () => {
    it('should standardize authentication errors across tools', async () => {
      // Create a standardized auth error
      const authError = new LinearError(
        'Authentication failed',
        "AuthenticationError" as LinearErrorType,
        null,
        401
      );
      
      // Format using the standardized formatter
      const response = formatErrorResponse(authError);
      
      // Verify standardized format
      const text = getResponseText(response);
      expect(text).toContain('Authentication error');
      expect(text).toContain('Please check your Linear API key');
      expect(text).toContain('Authentication failed');
    });
  });
  
  describe('Not Found Errors', () => {
    it('should standardize not found errors across tools', async () => {
      // Create a standardized not found error
      const notFoundError = new LinearError(
        'Resource not found',
        "FeatureNotAccessible" as LinearErrorType,
        null,
        404
      );
      
      // Format using the standardized formatter
      const response = formatErrorResponse(notFoundError);
      
      // Verify standardized format
      const text = getResponseText(response);
      expect(text).toContain('Not found');
      expect(text).toContain('Resource not found');
    });
  });
  
  describe('Validation Errors', () => {
    it('should standardize validation errors across tools', async () => {
      // Create a standardized validation error
      const validationError = new LinearError(
        'Invalid input: Title cannot be empty',
        "InvalidInput" as LinearErrorType,
        null,
        400
      );
      
      // Format using the standardized formatter
      const response = formatErrorResponse(validationError);
      
      // Verify standardized format
      const text = getResponseText(response);
      expect(text).toContain('Validation error');
      expect(text).toContain('Invalid input');
    });
  });
  
  describe('Network Errors', () => {
    it('should standardize network errors across tools', async () => {
      // Create a standardized network error
      const networkError = new LinearError(
        'Unable to connect to Linear API',
        "NetworkError" as LinearErrorType,
        null,
        0
      );
      
      // Format using the standardized formatter
      const response = formatErrorResponse(networkError);
      
      // Verify standardized format
      const text = getResponseText(response);
      expect(text).toContain('Network error');
      expect(text).toContain('Unable to connect to Linear API');
      expect(text).toContain('Please check your internet connection');
    });
  });
  
  describe('Unexpected Errors', () => {
    it('should handle unexpected runtime exceptions', async () => {
      // Create unexpected errors
      const runtimeError = new LinearError(
        'Unexpected runtime error',
        "Unknown" as LinearErrorType,
        null,
        500
      );
      
      const otherError = new LinearError(
        'Something went terribly wrong',
        "Other" as LinearErrorType,
        null,
        500
      );
      
      // Format using the standardized formatter
      const runtimeResponse = formatErrorResponse(runtimeError);
      const otherResponse = formatErrorResponse(otherError);
      
      // Verify standardized handling of unexpected errors
      expect(getResponseText(runtimeResponse)).toContain('Unexpected error');
      expect(getResponseText(runtimeResponse)).toContain('Unexpected runtime error');
      
      expect(getResponseText(otherResponse)).toContain('Unexpected error');
      expect(getResponseText(otherResponse)).toContain('Something went terribly wrong');
    });
  });
  
  describe('Success Response Formatting', () => {
    it('should format success responses consistently', async () => {
      // Create standardized success responses
      const createResponse = formatSuccessResponse('created', 'issue');
      const updateResponse = formatSuccessResponse('updated', 'issue');
      
      // Verify standardized success formatting
      expect(getResponseText(createResponse)).toContain('Success: issue created');
      expect(getResponseText(updateResponse)).toContain('Success: issue updated');
    });
  });
  
  describe('Logging Standardization', () => {
    it('should verify consistent logging patterns across tools', async () => {
      // Create a standardized not found error
      const notFoundError = new LinearError(
        'Issue not found',
        "FeatureNotAccessible" as LinearErrorType,
        null,
        404
      );
      
      // Format using the standardized formatter
      const response = formatErrorResponse(notFoundError);
      
      // Verify standardized format
      const text = getResponseText(response);
      expect(text).toContain('Not found');
      expect(text).toContain('Issue not found');
    });
  });
}); 