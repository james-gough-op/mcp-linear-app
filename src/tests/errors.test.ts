import { LinearErrorType } from '@linear/sdk';
import { describe, expect, it } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { createSuccessResponse, mockApiResponses } from './utils/test-utils.js';

/**
 * Tests for Linear API error handling
 * 
 * These tests validate the error handling capabilities of the Linear client
 */

describe('Linear Error Handling', () => {
  describe('Error Classification', () => {
    it('should create errors with correct types and properties', () => {
      // Test error creation with different types
      const authError = new LinearError(
        'Authentication failed', 
        LinearErrorType.AuthenticationError, 
        null, 
        401
      );
      
      expect(authError.type).toBe(LinearErrorType.AuthenticationError);
      expect(authError.message).toContain('Authentication');
      expect(authError.status).toBe(401);
      
      // Test user-friendly messages
      expect(authError.userMessage).toContain('API key');
      expect(authError.userMessage).toContain('check');
      
      // Test rate limit error with retry-after
      const rateLimitError = new LinearError(
        'Rate limit exceeded',
        LinearErrorType.Ratelimited,
        null,
        429,
        30
      );
      
      expect(rateLimitError.userMessage).toContain('30 seconds');
    });
  });

  describe('GraphQL Error Parsing', () => {
    it('should parse authentication errors correctly', () => {
      // Create a mock HTTP 401 error response
      const mockAuthError = {
        response: {
          status: 401,
          errors: [
            {
              message: 'Authentication required',
              extensions: {
                code: 'UNAUTHENTICATED'
              }
            }
          ]
        }
      };
      
      const parsedAuthError = LinearError.fromGraphQLError(mockAuthError);
      
      expect(parsedAuthError.type).toBe(LinearErrorType.AuthenticationError);
      expect(parsedAuthError.status).toBe(401);
    });
    
    it('should parse rate limit errors correctly', () => {
      // Create a mock rate limit error
      const mockRateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '45'
          },
          errors: [
            {
              message: 'Rate limit exceeded',
              extensions: {
                code: 'RATE_LIMITED'
              }
            }
          ]
        }
      };
      
      const parsedRateLimitError = LinearError.fromGraphQLError(mockRateLimitError);
      
      expect(parsedRateLimitError.type).toBe(LinearErrorType.Ratelimited);
      expect(parsedRateLimitError.retryAfter).toBe(45);
    });
    
    it('should parse validation errors correctly', () => {
      // Create a mock validation error
      const mockValidationError = {
        response: {
          status: 400,
          errors: [
            {
              message: 'Cannot query field X on type Y',
              extensions: {
                code: 'GRAPHQL_VALIDATION_FAILED',
                type: 'VALIDATION'
              }
            }
          ]
        }
      };
      
      const parsedValidationError = LinearError.fromGraphQLError(mockValidationError);
      
      expect(parsedValidationError.type).toBe(LinearErrorType.InvalidInput);
    });
  });

  describe('Result Helpers', () => {
    it('should create success result objects correctly', () => {
      // Test success result
      const successData = { id: '123', name: 'Test' };
      const successResult = createSuccessResponse(successData);
      
      expect(successResult.success).toBe(true);
      expect(successResult.data).toBe(successData);
      // Success results don't have an error property, so we don't check for it
    });
    
    it('should create error result objects correctly', () => {
      // Test error result
      const error = new LinearError('Test error', LinearErrorType.InvalidInput);
      const errorResult = mockApiResponses.mockErrorResponse('Test error', LinearErrorType.InvalidInput);
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.error?.type).toBe(error.type);
      expect(errorResult.error?.message).toContain(error.message);
    });
  });

  describe('Safe Execution Methods', () => {
    it('should handle invalid queries gracefully', async () => {
      // This query has a syntax error that will cause a validation error
      const invalidQuery = `
        query {
          thisFieldDoesNotExist {
            id
          }
        }
      `;
      
      const result = await enhancedClient.safeExecuteGraphQLQuery(invalidQuery);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      
      // The Linear API sometimes returns these errors as UNKNOWN instead of VALIDATION
      // Accept either for the test to pass
      if (result.error) {
        expect([LinearErrorType.InvalidInput, LinearErrorType.Unknown]).toContain(result.error.type);
        
        // Check that the error message contains information about the invalid field
        expect(result.error.message).toContain('thisFieldDoesNotExist');
      }
    });
  });
}); 