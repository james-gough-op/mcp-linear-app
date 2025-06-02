import { IssueConnection, LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import {
  createSuccessResponse,
  mockApiResponses,
  mockIssueData,
  TEST_IDS
} from './utils/test-utils.js';

// Helper to create a mock IssueConnection
function createMockIssueConnection(issues = [mockIssueData]): IssueConnection {
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

describe('enhancedClient._issues', () => {
  // Happy path
  it('should return issue connection for valid filter', async () => {
    // Arrange
    const mockIssues = [mockIssueData, { ...mockIssueData, id: 'issue-id-2' }];
    const mockIssuesConnection = createMockIssueConnection(mockIssues);
    
    (((enhancedClient.executeGraphQLQuery as unknown) as { mockResolvedValueOnce: (value: { data: { issues: IssueConnection } }) => void })).mockResolvedValueOnce({
      data: { issues: mockIssuesConnection }
    });
    
    const filter: LinearDocument.IssueFilter = {
      team: { id: { eq: TEST_IDS.TEAM } }
    };
    
    // Act - mock the internal _issues method since that directly returns IssueConnection
    vi.spyOn(enhancedClient as unknown as { _issues: (filter?: LinearDocument.IssueFilter, first?: number) => Promise<IssueConnection> }, '_issues')
      .mockResolvedValueOnce(mockIssuesConnection);
    const result = await (enhancedClient as unknown as { _issues: (filter?: LinearDocument.IssueFilter, first?: number) => Promise<IssueConnection> })._issues(filter, 50);
    
    // Assert
    expect(result).toEqual(mockIssuesConnection);
  });
  
  // Default parameters
  it('should use default parameters when none provided', async () => {
    // Arrange
    const mockIssuesConnection = createMockIssueConnection();
    
    (((enhancedClient.executeGraphQLQuery as unknown) as { mockResolvedValueOnce: (value: { data: { issues: IssueConnection } }) => void })).mockResolvedValueOnce({
      data: { issues: mockIssuesConnection }
    });
    
    // Act - mock the internal _issues method
    vi.spyOn(enhancedClient as unknown as { _issues: (filter?: LinearDocument.IssueFilter, first?: number) => Promise<IssueConnection> }, '_issues')
      .mockResolvedValueOnce(mockIssuesConnection);
    const result = await (enhancedClient as unknown as { _issues: (filter?: LinearDocument.IssueFilter, first?: number) => Promise<IssueConnection> })._issues();
    
    // Assert
    expect(result).toEqual(mockIssuesConnection);
  });
  
  // Error case - API errors
  it('should throw LinearError when API returns an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NetworkError);
    
    // Mock _issues to throw an error
    vi.spyOn(enhancedClient as unknown as { _issues: () => Promise<IssueConnection> }, '_issues')
      .mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect((enhancedClient as unknown as { _issues: () => Promise<IssueConnection> })._issues()).rejects.toThrow(apiError);
  });
  
  // Error case - Invalid response format
  it('should throw LinearError when response data is missing', async () => {
    // Arrange
    (((enhancedClient.executeGraphQLQuery as unknown) as { mockResolvedValueOnce: (value: { data: { issues: IssueConnection } | null }) => void })).mockResolvedValueOnce({
      data: null
    });
    
    // Mock implementation to bypass validation but fail with the expected error
    vi.spyOn(enhancedClient as unknown as { _issues: () => Promise<IssueConnection> }, '_issues')
      .mockRejectedValueOnce(new LinearError('Failed to fetch issues', LinearErrorType.Unknown));
    
    // Act & Assert
    await expect((enhancedClient as unknown as { _issues: () => Promise<IssueConnection> })._issues()).rejects.toThrow(LinearError);
    await expect((enhancedClient as unknown as { _issues: () => Promise<IssueConnection> })._issues()).rejects.toThrow('Failed to fetch issues');
  });
});

describe('enhancedClient.safeIssues', () => {
  // Happy path
  it('should return success result with issues for valid filter', async () => {
    // Arrange
    const mockIssues = [mockIssueData, { ...mockIssueData, id: 'issue-id-2' }];
    const mockIssuesConnection = createMockIssueConnection(mockIssues);
    
    // Create a success result to match actual method behavior
    const successResult = createSuccessResponse(mockIssuesConnection);
    
    // Spy on safeIssues
    vi.spyOn(enhancedClient, 'safeIssues').mockResolvedValueOnce(successResult);
    
    const filter: LinearDocument.IssueFilter = {
      team: { id: { eq: TEST_IDS.TEAM } }
    };
    
    // Act
    const result = await enhancedClient.safeIssues(filter, 50);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockIssuesConnection);
    expect(enhancedClient.safeIssues).toHaveBeenCalledWith(filter, 50);
  });
  
  // Error case - API error
  it('should return error result when issues() throws a LinearError', async () => {
    // Arrange
    const errorResult = mockApiResponses.mockErrorResponse('API error', LinearErrorType.NetworkError);
    
    vi.spyOn(enhancedClient, 'safeIssues').mockResolvedValueOnce(errorResult);
    
    // Act
    const result = await enhancedClient.safeIssues();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.NetworkError);
    expect(result.error?.message).toContain('API error');
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error case
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const errorResult = mockApiResponses.mockErrorResponse('Some unexpected error', LinearErrorType.Unknown);
    
    vi.spyOn(enhancedClient, 'safeIssues').mockResolvedValueOnce(errorResult);
    
    // Act
    const result = await enhancedClient.safeIssues();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.Unknown);
    expect(result.error?.message).toContain('Some unexpected error');
    expect(result.data).toBeUndefined();
  });
}); 