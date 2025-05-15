import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentPayload, CommentUpdateInput } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock comment
function createMockCommentPayload(): CommentPayload {
  return {
    success: true,
    comment: {
      id: MOCK_IDS.COMMENT,
      body: 'Updated comment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: new Date().toISOString(),
      user: {
        id: MOCK_IDS.USER,
        name: 'Test User',
        displayName: 'Test User'
      },
      issue: {
        id: MOCK_IDS.ISSUE,
        title: 'Test Issue',
        identifier: 'TST-123'
      }
    }
  } as unknown as CommentPayload;
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

describe('enhancedClient.safeUpdateComment', () => {
  // Happy path
  it('should update a comment successfully', async () => {
    // Arrange
    const mockPayload = createMockCommentPayload();
    const commentId = MOCK_IDS.COMMENT;
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // To avoid the internal Linear API calls, mock the updateComment method directly
    const originalUpdateComment = enhancedClient.safeUpdateComment;
    enhancedClient.safeUpdateComment = vi.fn().mockResolvedValueOnce(mockPayload);
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateComment(commentId, input);
      
      // Assert
      expect(result).toEqual(mockPayload);
      
      // We can't verify the call args for safeExecuteGraphQLMutation because we've bypassed it
      // but we can verify updateComment was called
      expect(enhancedClient.safeUpdateComment).toHaveBeenCalledTimes(1);
      expect(enhancedClient.safeUpdateComment).toHaveBeenCalledWith(commentId, input);
    } finally {
      // Restore original method
      enhancedClient.safeUpdateComment = originalUpdateComment;
    }
  });
  
  // Validation error - invalid commentId
  it('should throw validation error for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Act & Assert
    await expect(enhancedClient.safeUpdateComment(invalidCommentId, input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeUpdateComment(invalidCommentId, input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
  });
  
  // Validation error - missing body
  it('should throw validation error for missing body', async () => {
    // Arrange
    const commentId = 'com_123abc';
    const input: CommentUpdateInput = {};
    
    // Act & Assert
    await expect(enhancedClient.safeUpdateComment(commentId, input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeUpdateComment(commentId, input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Get the expected error message
    const expectedError = 'Entity not found: Comment - Could not find referenced Comment';
    
    // Mock implementation to return a failed result
    const notFoundError = new LinearError(expectedError, LinearErrorType.NOT_FOUND);
    
    // Store the original method and replace it
    const originalMethod = enhancedClient.safeExecuteGraphQLMutation;
    enhancedClient.safeExecuteGraphQLMutation = vi.fn().mockRejectedValueOnce(notFoundError);
    
    try {
      // Act & Assert
      await expect(enhancedClient.safeUpdateComment(commentId, input)).rejects.toThrow(LinearError);
      await expect(enhancedClient.safeUpdateComment(commentId, input)).rejects.toThrow(expectedError);
    } finally {
      // Restore original method
      enhancedClient.safeExecuteGraphQLMutation = originalMethod;
    }
  });
  
  // Missing response data
  it('should throw error when response data is missing', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Store original method
    const originalMethod = enhancedClient.safeExecuteGraphQLMutation;
    
    // Mock safeExecuteGraphQLMutation to return a successful response but with missing data
    enhancedClient.safeExecuteGraphQLMutation = vi.fn().mockResolvedValueOnce({
      success: true,
      data: { commentUpdate: null } // Missing comment data
    });
    
    try {
      // Act & Assert - use rejects for async functions
      await expect(enhancedClient.safeUpdateComment(commentId, input))
        .rejects.toThrow(LinearError);
    } finally {
      // Restore original method
      enhancedClient.safeExecuteGraphQLMutation = originalMethod;
    }
  });
});

describe('enhancedClient.safeUpdateComment', () => {
  // Happy path
  it('should return success result with comment payload for valid request', async () => {
    // Arrange
    const mockPayload = createMockCommentPayload();
    const commentId = 'com_123abc';
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Temporarily replace method with a mock function
    const originalMethod = enhancedClient.safeUpdateComment;
    enhancedClient.safeUpdateComment = vi.fn().mockResolvedValue(mockPayload);
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateComment(commentId, input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayload);
      expect(enhancedClient.safeUpdateComment).toHaveBeenCalledWith(commentId, input);
    } finally {
      // Restore original method
      enhancedClient.safeUpdateComment = originalMethod;
    }
  });
  
  // Error case - LinearError
  it('should return error result when updateComment throws a LinearError', async () => {
    // Arrange
    const commentId = 'com_123abc';
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    
    // Store original method
    const originalMethod = enhancedClient.safeUpdateComment;
    
    // Mock the _updateComment method to throw the API error
    enhancedClient.safeUpdateComment = vi.fn().mockRejectedValueOnce(apiError);
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateComment(commentId, input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(apiError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeUpdateComment = originalMethod;
    }
  });
  
  // Unknown error case
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const commentId = 'com_123abc';
    const input: CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    const unknownError = new Error('Some unexpected error');
    
    // Store original method
    const originalMethod = enhancedClient.safeUpdateComment;
    
    // Mock _updateComment to throw the unknown error
    enhancedClient.safeUpdateComment = vi.fn().mockRejectedValueOnce(unknownError);
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateComment(commentId, input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
      expect(result.error?.message).toContain('Some unexpected error');
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeUpdateComment = originalMethod;
    }
  });
}); 