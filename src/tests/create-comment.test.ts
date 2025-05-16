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
      id: 'com_123abc',
      body: 'Test comment body',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: null,
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
    },
    lastSyncId: '123abc',
  } as unknown as CommentPayload;
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

describe('enhancedClient.safeCreateComment', () => {
  // Happy path
  it('should create a comment successfully', async () => {
    // Arrange
    const mockPayload = createMockCommentPayload();
    const input: LinearDocument.CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };

    // Mock the underlying GraphQL method that safeCreateComment uses
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentCreate: mockPayload })
    );
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation CreateComment'),
      { input }
    );
  });
  
  // Validation error - missing body
  it('should return error result for missing body', async () => {
    // Arrange
    const input = {
      issueId: MOCK_IDS.ISSUE
    } as LinearDocument.CommentCreateInput;
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - missing context ID
  it('should return error result for missing context ID', async () => {
    // Arrange
    const input = {
      body: 'Test comment body'
    } as LinearDocument.CommentCreateInput;
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - invalid issue ID
  it('should return error result for invalid issue ID format', async () => {
    // Arrange
    const input: LinearDocument.CommentCreateInput = {
      body: 'Test comment body',
      issueId: 'invalid-id-format'
    };
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Error from API
  it('should handle API errors gracefully', async () => {
    // Arrange
    const input: LinearDocument.CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NetworkError);
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createErrorResult(apiError)
    );
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
  
  // Response validation error
  it('should handle invalid API responses gracefully', async () => {
    // Arrange
    const input: LinearDocument.CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResult({ commentCreate: null })
    );
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
  });
});
