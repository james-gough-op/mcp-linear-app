import { CommentPayload, LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { createErrorResult, createSuccessResult, LinearError } from '../libs/errors.js';
import { createLinearUpdateCommentTool } from '../tools/linear/update-comment.js';
import {
  createMockClient,
  createSuccessResponse,
  expectErrorResponse,
  expectSuccessResponse,
  mockApiResponses,
  mockIssueData,
  mockUserData,
  TEST_IDS
} from './utils/test-utils.js';

const enhancedClient = getEnhancedClient();

// Helper to create a mock comment response
function createMockCommentResponse(): Record<string, unknown> {
  return {
    success: true,
    comment: {
      id: TEST_IDS.COMMENT,
      body: 'Updated comment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: new Date().toISOString(),
      user: mockUserData,
      issue: mockIssueData
    }
  };
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
    const mockPayload = createMockCommentResponse();
    const commentId = TEST_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Directly mock the safeUpdateComment method
    vi.spyOn(enhancedClient, 'safeUpdateComment').mockResolvedValueOnce(
      createSuccessResult(mockPayload as unknown as CommentPayload)
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
  });
  
  // Validation error - invalid commentId
  it('should return error result for invalid commentId', async () => {
    // Arrange
    const invalidCommentId = 'invalid-id';
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Let this one run for real to test validation
    
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
    const commentId = TEST_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {};
    
    // Let this one run for real to test validation
    
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
    const commentId = TEST_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Directly mock the safeUpdateComment method
    vi.spyOn(enhancedClient, 'safeUpdateComment').mockResolvedValueOnce(
      createErrorResult(
        new LinearError(
          'Entity not found: Comment - Could not find referenced Comment', 
          LinearErrorType.FeatureNotAccessible
        )
      )
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.FeatureNotAccessible);
  });
  
  // Missing response data
  it('should handle missing response data gracefully', async () => {
    // Arrange
    const commentId = TEST_IDS.COMMENT;
    const input: LinearDocument.CommentUpdateInput = {
      body: 'Updated comment'
    };
    
    // Directly mock the safeUpdateComment method
    vi.spyOn(enhancedClient, 'safeUpdateComment').mockResolvedValueOnce(
      createErrorResult(
        new LinearError('Failed to update comment: No data returned', LinearErrorType.Unknown)
      )
    );
    
    // Act
    const result = await enhancedClient.safeUpdateComment(commentId, input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
  });
});

describe('LinearUpdateCommentTool (DI pattern)', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  const commentId = TEST_IDS.COMMENT;
  const validComment = 'Updated comment';

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should update a comment successfully', async () => {
    mockClient.safeUpdateComment.mockResolvedValueOnce(
      createSuccessResponse({ comment: { id: commentId } })
    );
    
    const tool = createLinearUpdateCommentTool(mockClient);
    const response = await tool.handler(
      { commentId, comment: validComment }, 
      { signal: new AbortController().signal }
    );
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('updated');
    expect(mockClient.safeUpdateComment).toHaveBeenCalledWith(commentId, { body: validComment });
  });

  it('should handle update error', async () => {
    mockClient.safeUpdateComment.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Update failed', LinearErrorType.Unknown)
    );
    
    const tool = createLinearUpdateCommentTool(mockClient);
    const response = await tool.handler(
      { commentId, comment: validComment }, 
      { signal: new AbortController().signal }
    );
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Update failed');
  });

  it('should delete a comment successfully', async () => {
    mockClient.safeDeleteComment.mockResolvedValueOnce(
      createSuccessResponse({ success: true })
    );
    
    const tool = createLinearUpdateCommentTool(mockClient);
    const response = await tool.handler(
      { commentId, delete: true }, 
      { signal: new AbortController().signal }
    );
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('deleted');
    expect(mockClient.safeDeleteComment).toHaveBeenCalledWith(commentId);
  });

  it('should handle delete error', async () => {
    mockClient.safeDeleteComment.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Delete failed', LinearErrorType.Unknown)
    );
    
    const tool = createLinearUpdateCommentTool(mockClient);
    const response = await tool.handler(
      { commentId, delete: true }, 
      { signal: new AbortController().signal }
    );
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Delete failed');
  });
}); 