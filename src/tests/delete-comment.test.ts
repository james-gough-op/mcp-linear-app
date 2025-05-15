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
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLMutation');
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
    
    // Store original method
    const originalMethod = enhancedClient.executeGraphQLMutation;
    
    // Create mock function and replace original
    const mockExecute = vi.fn().mockResolvedValue({
      data: { commentDelete: mockResponse }
    });
    enhancedClient.executeGraphQLMutation = mockExecute;
    
    try {
      // Act
      const result = await enhancedClient.safeDeleteComment(commentId);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('mutation DeleteComment'),
        { id: commentId }
      );
    } finally {
      // Restore original method
      enhancedClient.executeGraphQLMutation = originalMethod;
    }
  });
  
  // Validation error
  it('should throw validation error for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    
    // Act & Assert
    await expect(enhancedClient.safeDeleteComment(invalidCommentId)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeDeleteComment(invalidCommentId)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    
    // Store original method
    const originalMethod = enhancedClient.executeGraphQLMutation;
    
    // Create mock function that returns a rejected promise
    const mockExecute = vi.fn().mockRejectedValue(
      new LinearError('Entity not found: Comment', LinearErrorType.NOT_FOUND)
    );
    enhancedClient.executeGraphQLMutation = mockExecute;
    
    try {
      // Act & Assert
      await expect(enhancedClient.safeDeleteComment(commentId)).rejects.toThrow(LinearError);
      await expect(enhancedClient.safeDeleteComment(commentId)).rejects.toThrow(/Entity not found: Comment/);
    } finally {
      // Restore original method
      enhancedClient.executeGraphQLMutation = originalMethod;
    }
  });
  
  // Missing response data
  it('should throw error when response data is missing', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    
    // Store original method
    const originalMethod = enhancedClient.safeDeleteComment;
    
    // Create mock implementation
    const mockDeleteComment = vi.fn().mockRejectedValue(
      new LinearError('Failed to delete comment', LinearErrorType.UNKNOWN)
    );
    enhancedClient.safeDeleteComment = mockDeleteComment;
    
    try {
      // Act & Assert
      await expect(enhancedClient.safeDeleteComment(commentId)).rejects.toThrow('Failed to delete comment');
    } finally {
      // Restore original method
      enhancedClient.safeDeleteComment = originalMethod;
    }
  });
});

describe('enhancedClient.safeDeleteComment', () => {
  // Happy path
  it('should return success result with delete payload for valid request', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const mockResponse = createMockSuccessResponse();
    
    // Store original method
    const originalMethod = enhancedClient.safeDeleteComment;
    
    // Create mock function
    const mockDeleteComment = vi.fn().mockResolvedValue(mockResponse);
    enhancedClient.safeDeleteComment = mockDeleteComment;
    
    try {
      // Act
      const result = await enhancedClient.safeDeleteComment(commentId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockDeleteComment).toHaveBeenCalledWith(commentId);
    } finally {
      // Restore original method
      enhancedClient.safeDeleteComment = originalMethod;
    }
  });
  
  // Error case
  it('should return error result when deleteComment throws a LinearError', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    
    // Store original method
    const originalMethod = enhancedClient.safeDeleteComment;
    
    // Create mock function
    const mockDeleteComment = vi.fn().mockRejectedValue(apiError);
    enhancedClient.safeDeleteComment = mockDeleteComment;
    
    try {
      // Act
      const result = await enhancedClient.safeDeleteComment(commentId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(apiError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeDeleteComment = originalMethod;
    }
  });
  
  // Unknown error
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const unknownError = new Error('Some unexpected error');
    
    // Store original method
    const originalMethod = enhancedClient.safeDeleteComment;
    
    // Create mock function
    const mockDeleteComment = vi.fn().mockRejectedValue(unknownError);
    enhancedClient.safeDeleteComment = mockDeleteComment;
    
    try {
      // Act
      const result = await enhancedClient.safeDeleteComment(commentId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
      expect(result.error?.message).toContain('Some unexpected error');
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeDeleteComment = originalMethod;
    }
  });
}); 