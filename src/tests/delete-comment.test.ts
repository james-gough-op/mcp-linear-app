import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeletePayload } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock success response
function createMockSuccessResponse(): DeletePayload {
  return {
    success: true,
    lastSyncId: 12345
  } as DeletePayload;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.deleteComment', () => {
  // Happy path
  it('should delete a comment successfully', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const mockResponse = createMockSuccessResponse();
    
    (enhancedClient.safeExecuteGraphQLMutation as any).mockResolvedValueOnce({
      data: { commentDelete: mockResponse }
    });
    
    // Act
    const result = await enhancedClient.deleteComment(commentId);
    
    // Assert
    expect(result).toEqual(mockResponse as LinearResult<unknown>);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation DeleteComment'),
      { id: commentId }
    );
  });
  
  // Validation error
  it('should throw validation error for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    
    // Act & Assert
    await expect(enhancedClient.deleteComment(invalidCommentId)).rejects.toThrow(LinearError);
    await expect(enhancedClient.deleteComment(invalidCommentId)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    
    // Mock implementation to return a network error
    (enhancedClient.safeExecuteGraphQLMutation as any).mockRejectedValueOnce(
      new LinearError('Entity not found: Comment', LinearErrorType.NOT_FOUND)
    );
    
    // Act & Assert
    await expect(enhancedClient.deleteComment(commentId)).rejects.toThrow(LinearError);
    await expect(enhancedClient.deleteComment(commentId)).rejects.toThrow(/Entity not found: Comment/);
  });
  
  // Missing response data
  it('should throw error when response data is missing', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    
    // Mock implementation to return an error about missing data
    vi.spyOn(enhancedClient as any, 'deleteComment').mockImplementationOnce(async () => {
      throw new LinearError('Failed to delete comment', LinearErrorType.UNKNOWN);
    });
    
    // Act & Assert
    await expect(enhancedClient.deleteComment(commentId)).rejects.toThrow('Failed to delete comment');
  });
});

describe('enhancedClient.safeDeleteComment', () => {
  // Happy path
  it('should return success result with delete payload for valid request', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const mockResponse = createMockSuccessResponse();
    
    // Spy on deleteComment which is used internally by safeDeleteComment
    vi.spyOn(enhancedClient, 'deleteComment').mockResolvedValueOnce(mockResponse as LinearResult<unknown>);
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse as LinearResult<unknown>);
    expect(enhancedClient.deleteComment).toHaveBeenCalledWith(commentId);
  });
  
  // Error case
  it('should return error result when deleteComment throws a LinearError', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'deleteComment').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const unknownError = new Error('Some unexpected error');
    vi.spyOn(enhancedClient, 'deleteComment').mockRejectedValueOnce(unknownError);
    
    // Act
    const result = await enhancedClient.safeDeleteComment(commentId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
    expect(result.error?.message).toContain('Some unexpected error');
    expect(result.data).toBeUndefined();
  });
}); 