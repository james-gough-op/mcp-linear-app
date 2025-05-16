import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import {
  createMockIssue,
  MOCK_IDS
} from './mocks/mock-data.js';

// Setup mocks
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLQuery');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeGetIssue', () => {
  // Happy path
  it('should return issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    // Mock the underlying GraphQL query instead
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValue({ success: true, data: { issue: mockIssue } });
    
    // Act
    const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    // The safeGetIssue method is expected to return a Result object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockIssue);
    }
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalled();
  });
  
  // Error cases
  it('should throw validation error for invalid ID format', async () => {
    // No need to mock safeExecuteGraphQLQuery here as validation should happen before
    
    // Act
    const result = await enhancedClient.safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe("InvalidInput" as LinearErrorType);
    }
    expect(enhancedClient.safeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // More tests...
});

describe('enhancedClient.safeGetIssue', () => {
  // Happy path
  it('should return success result with issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    // Mock the underlying GraphQL query
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValue({ success: true, data: { issue: mockIssue } });
    
    // Act
    const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data).toEqual(mockIssue);
    }
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(expect.any(String), { issueId: MOCK_IDS.ISSUE });
  });
  
  // Error case for validation error
  it('should return error result for invalid ID', async () => {
    // Arrange
    // Validation error should be thrown by the method itself before any GraphQL call
    
    // Act
    const result = await enhancedClient.safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe("InvalidInput" as LinearErrorType);
    }
    expect(result.data).toBeUndefined();
    expect(enhancedClient.safeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Error case for not found
  it('should return error result for not found issue', async () => {
    // Arrange
    const notFoundError = new LinearError('Issue not found', "FeatureNotAccessible" as LinearErrorType);
    // Mock the GraphQL query to simulate a "not found" scenario from the API
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockRejectedValue(notFoundError);
    
    // Act
    const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toEqual(notFoundError);
    }
    expect(result.data).toBeUndefined();
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(expect.any(String), { issueId: MOCK_IDS.ISSUE });
  });
  
  // Unknown error conversion
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const unknownError = new Error('Some unexpected error');
    // Mock the GraphQL query to simulate an unexpected error
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockRejectedValue(unknownError);
    
    // Act
    const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe("Unknown" as LinearErrorType);
        expect(result.error?.message).toContain('Some unexpected error');
    }
    expect(result.data).toBeUndefined();
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(expect.any(String), { issueId: MOCK_IDS.ISSUE });
  });
}); 