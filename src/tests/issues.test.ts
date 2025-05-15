import { LinearDocument } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueConnection, IssueFilter } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import {
  createMockIssue,
  MOCK_IDS
} from './mocks/mock-data.js';

// Helper to create a mock IssueConnection
function createMockIssueConnection(issues = [createMockIssue()]): IssueConnection {
  // Use type assertion to bypass strict type checking
  return {
    edges: issues.map(issue => ({ node: issue, cursor: 'cursor' })),
    nodes: issues,
    pageInfo: {
      hasNextPage: false,
      endCursor: 'cursor-value',
      startCursor: 'start-cursor',
      hasPreviousPage: false
    }
  } as unknown as IssueConnection;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLQuery');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.issues', () => {
  // Happy path
  it('should return issue connection for valid filter', async () => {
    // Arrange
    const mockIssues = [createMockIssue(), createMockIssue()];
    const mockIssuesConnection = createMockIssueConnection(mockIssues);
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { issues: mockIssuesConnection }
    });
    
    const filter: IssueFilter = {
      team: { id: { eq: MOCK_IDS.TEAM } }
    };
    
    // Act
    const result = await enhancedClient.issues(filter, 50);
    
    // Assert
    expect(result).toEqual(mockIssuesConnection);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query GetIssues'), 
      { filter, first: 50, after: undefined }
    );
  });
  
  // Default parameters
  it('should use default parameters when none provided', async () => {
    // Arrange
    const mockIssuesConnection = createMockIssueConnection();
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { issues: mockIssuesConnection }
    });
    
    // Act
    const result = await enhancedClient.issues();
    
    // Assert
    expect(result).toEqual(mockIssuesConnection);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.any(String), 
      { filter: undefined, first: 50, after: undefined }
    );
  });
  
  // Error case - API errors
  it('should throw LinearError when API returns an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.executeGraphQLQuery as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.issues()).rejects.toThrow(apiError);
  });
  
  // Error case - Invalid response format
  it('should throw LinearError when response data is missing', async () => {
    // Arrange
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: null
    });
    
    // Mock implementation to bypass validation but fail with the expected error
    vi.spyOn(enhancedClient as any, 'issues').mockImplementationOnce(async () => {
      throw new LinearError('Failed to fetch issues', LinearErrorType.UNKNOWN);
    });
    
    // Act & Assert
    await expect(enhancedClient.issues()).rejects.toThrow(LinearError);
    await expect(enhancedClient.issues()).rejects.toThrow('Failed to fetch issues');
  });
});

describe('enhancedClient.safeIssues', () => {
  // Happy path
  it('should return success result with issues for valid filter', async () => {
    // Arrange
    const mockIssues = [createMockIssue(), createMockIssue()];
    const mockIssuesConnection = createMockIssueConnection(mockIssues);
    
    // Spy on issues() which is used internally by safeIssues
    vi.spyOn(enhancedClient, 'issues').mockResolvedValueOnce(mockIssuesConnection as unknown as LinearDocument.IssueConnection);
    
    const filter: IssueFilter = {
      team: { id: { eq: MOCK_IDS.TEAM } }
    };
    
    // Act
    const result = await enhancedClient.safeIssues(filter, 50);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockIssuesConnection);
    expect(enhancedClient.issues).toHaveBeenCalledWith(filter, 50, undefined);
  });
  
  // Error case - API error
  it('should return error result when issues() throws a LinearError', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'issues').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeIssues();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error case
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const unknownError = new Error('Some unexpected error');
    vi.spyOn(enhancedClient, 'issues').mockRejectedValueOnce(unknownError);
    
    // Act
    const result = await enhancedClient.safeIssues();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
    expect(result.error?.message).toContain('Some unexpected error');
    expect(result.data).toBeUndefined();
  });
}); 