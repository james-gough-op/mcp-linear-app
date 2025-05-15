import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentCreateInput, CommentPayload } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
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
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.createComment', () => {
  // Happy path
  it('should create a comment successfully', async () => {
    // Arrange
    const mockPayload = createMockCommentPayload();
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    (enhancedClient.safeExecuteGraphQLMutation as any).mockResolvedValueOnce({
      data: { commentCreate: mockPayload }
    });
    
    // Act
    const result = await enhancedClient._createComment(input);
    
    // Assert
    expect(result).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation CreateComment'),
      { input }
    );
  });
  
  // Validation error - missing body
  it('should throw validation error for missing body', async () => {
    // Arrange
    const input = {
      issueId: MOCK_IDS.ISSUE
    } as CommentCreateInput;
    
    // Act & Assert
    await expect(enhancedClient._createComment(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient._createComment(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - missing context ID
  it('should throw validation error for missing context ID', async () => {
    // Arrange
    const input = {
      body: 'Test comment body'
    } as CommentCreateInput;
    
    // Act & Assert
    await expect(enhancedClient._createComment(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient._createComment(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - invalid issue ID
  it('should throw validation error for invalid issue ID format', async () => {
    // Arrange
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: 'invalid-id-format'
    };
    
    // Act & Assert
    await expect(enhancedClient._createComment(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient._createComment(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.safeExecuteGraphQLMutation as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient._createComment(input)).rejects.toThrow(apiError);
  });
  
  // Response validation error
  it('should throw error when API response is invalid', async () => {
    // Arrange
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    (enhancedClient.safeExecuteGraphQLMutation as any).mockResolvedValueOnce({
      data: { commentCreate: null }
    });
    
    // Act & Assert
    await expect(enhancedClient._createComment(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient._createComment(input)).rejects.toMatchObject({
      type: LinearErrorType.UNKNOWN
    });
  });
});

describe('enhancedClient.safeCreateComment', () => {
  // Happy path
  it('should return success result with comment payload for valid request', async () => {
    // Arrange
    const mockPayload = createMockCommentPayload();
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    // Spy on createComment which is used internally by safeCreateComment
    vi.spyOn(enhancedClient, 'safeCreateComment').mockResolvedValueOnce(mockPayload);
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient._createComment).toHaveBeenCalledWith(input);
  });
  
  // Error case - LinearError
  it('should return error result when createComment throws a LinearError', async () => {
    // Arrange
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'safeCreateComment').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
  
  // Error case - Other error
  it('should return error result when createComment throws a non-LinearError', async () => {
    // Arrange
    const input: CommentCreateInput = {
      body: 'Test comment body',
      issueId: MOCK_IDS.ISSUE
    };
    
    const genericError = new Error('Generic error');
    vi.spyOn(enhancedClient, 'safeCreateComment').mockRejectedValueOnce(genericError);
    
    // Act
    const result = await enhancedClient.safeCreateComment(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    if (result.error) {
      expect(result.error.message).toContain('Error in safeCreateComment');
      expect(result.error.message).toContain('Generic error');
      expect(result.error.type).toBe(LinearErrorType.UNKNOWN);
    }
    expect(result.data).toBeUndefined();
  });
});
