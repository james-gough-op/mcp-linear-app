import { DeletePayload, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { createErrorResult, createSuccessResult, LinearError } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock success response
function createMockSuccessResponse(): DeletePayload {
  return {
    success: true,
    lastSyncId: 12345,
    entityId: MOCK_IDS.COMMENT
  } as DeletePayload;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Set up global spies for methods we need to check in all tests
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeDeleteComment', () => {
  // Happy path
  it('should delete a comment successfully', async () => {
    // Arrange
    const mockPayload = createMockSuccessResponse();
    const commentId = MOCK_IDS.COMMENT;
        
    // Mock the underlying GraphQL method that safeDeleteComment uses
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentDelete: mockPayload })
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation DeleteComment'),
      { id: commentId }
    );
  });
  
  // Validation error
  it('should return error result for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    
    // Act
    const result = await enhancedClient.safeDeleteComment(invalidCommentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Error from API
  it('should handle API errors gracefully', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const apiError = new LinearError('Entity not found: Comment', LinearErrorType.FeatureNotAccessible);
    
    // Mock the underlying GraphQL method that safeDeleteComment uses
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createErrorResult(apiError)
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
  
  // Missing response data
  it('should handle missing response data gracefully', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    
    // Mock the underlying GraphQL method that safeDeleteComment uses
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentDelete: null })
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
}); 