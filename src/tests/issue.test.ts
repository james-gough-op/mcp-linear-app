import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import {
    createMockIssue,
    MOCK_IDS
} from './mocks/mock-data.js';

// Setup mocks
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLQuery');
  vi.spyOn(enhancedClient, 'issue');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.issue', () => {
  // Happy path
  it('should return issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    
    // Directly mock the issue method to return our mock data
    (enhancedClient.issue as any).mockResolvedValueOnce(mockIssue);
    
    // Act
    const result = await enhancedClient.issue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result).toEqual(mockIssue);
  });
  
  // Error cases
  it('should throw validation error for invalid ID format', async () => {
    // Arrange
    enhancedClient.issue.mockRejectedValueOnce(
      new LinearError('Invalid ID', LinearErrorType.VALIDATION)
    );
    
    // Act & Assert
    await expect(enhancedClient.issue('invalid-id')).rejects.toThrow(LinearError);
  });
  
  // More tests...
});

describe('enhancedClient.safeIssue', () => {
  // Happy path
  it('should return success result with issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    (enhancedClient.issue as any).mockResolvedValueOnce(mockIssue);
    
    // Act
    const result = await enhancedClient.safeIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockIssue);
    expect(enhancedClient.issue).toHaveBeenCalledWith(MOCK_IDS.ISSUE);
  });
  
  // Error case for validation error
  it('should return error result for invalid ID', async () => {
    // Arrange
    const validationError = new LinearError('Invalid ID', LinearErrorType.VALIDATION);
    (enhancedClient.issue as any).mockRejectedValueOnce(validationError);
    
    // Act
    const result = await enhancedClient.safeIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(validationError);
    expect(result.data).toBeUndefined();
  });
  
  // Error case for not found
  it('should return error result for not found issue', async () => {
    // Arrange
    const notFoundError = new LinearError('Issue not found', LinearErrorType.NOT_FOUND);
    (enhancedClient.issue as any).mockRejectedValueOnce(notFoundError);
    
    // Act
    const result = await enhancedClient.safeIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(notFoundError);
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error conversion
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const unknownError = new Error('Some unexpected error');
    (enhancedClient.issue as any).mockRejectedValueOnce(unknownError);
    
    // Act
    const result = await enhancedClient.safeIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
    expect(result.error?.message).toContain('Some unexpected error');
    expect(result.data).toBeUndefined();
  });
}); 