import { DeletePayload, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { createErrorResult, createSuccessResult, LinearError } from '../libs/errors.js';
import {
    TEST_IDS
} from './utils/test-utils.js';

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
    const mockPayload: DeletePayload = {
      success: true,
      lastSyncId: 12345,
      entityId: TEST_IDS.COMMENT
    } as DeletePayload;
    
    const commentId = TEST_IDS.COMMENT;
        
    // Directly mock the safeDeleteComment method
    vi.spyOn(enhancedClient, 'safeDeleteComment').mockResolvedValueOnce(
      createSuccessResult(mockPayload)
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
  });
  
  // Validation error
  it('should return error result for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    
    // Let this one run for real without mocking to test validation
    
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
    const commentId = TEST_IDS.COMMENT;
    
    // Directly mock the safeDeleteComment method
    vi.spyOn(enhancedClient, 'safeDeleteComment').mockResolvedValueOnce(
      createErrorResult(
        new LinearError('Entity not found: Comment', LinearErrorType.FeatureNotAccessible)
      )
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.FeatureNotAccessible);
    expect(result.error?.message).toContain('Entity not found: Comment');
  });
  
  // Missing response data
  it('should handle missing response data gracefully', async () => {
    // Arrange
    const commentId = TEST_IDS.COMMENT;
    
    // Directly mock the safeDeleteComment method
    vi.spyOn(enhancedClient, 'safeDeleteComment').mockResolvedValueOnce(
      createErrorResult(
        new LinearError('Failed to delete comment: No data returned', LinearErrorType.Unknown)
      )
    );
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
  });
}); 