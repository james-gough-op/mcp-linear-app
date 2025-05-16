import { CommentPayload, LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, createErrorResult, createSuccessResult } from '../libs/errors.js';
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
  
  // Set up global spies for methods we need to check
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
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Mock the underlying GraphQL execution
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentUpdate: mockPayload })
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation UpdateComment'),
      { id: commentId, input }
    );
  });
  
  // Validation error - invalid commentId
  it('should return error result for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Act
    const result = await enhancedClient.safeUpdateComment(invalidCommentId, input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - missing body
  it('should return error result for missing body', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {};
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
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
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Mock API error response
    const apiError = new LinearError(
      'Entity not found: Comment - Could not find referenced Comment', 
      LinearErrorType.FeatureNotAccessible
    );
    
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createErrorResult(apiError)
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
  
  // Missing response data
  it('should handle missing response data gracefully', async () => {
    // Arrange
    const commentId = MOCK_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Mock successful response but with missing data
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentUpdate: null })
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
}); 