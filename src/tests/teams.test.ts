import { LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import {
    createSuccessResponse,
    mockApiResponses,
    mockTeamData,
    TEST_IDS
} from './utils/test-utils.js';

// Helper to create a mock teams connection
function createMockTeamsConnection(): LinearDocument.TeamConnection {
  return {
    nodes: [
      {
        ...mockTeamData,
        id: TEST_IDS.TEAM
      }
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'cursor1',
      endCursor: 'cursor1'
    }
  } as unknown as LinearDocument.TeamConnection;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Set up global spies for methods we need to check in all tests
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLQuery');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeTeams', () => {
  // Happy path
  it('should fetch teams successfully', async () => {
    // Arrange
    const mockTeams = createMockTeamsConnection();
    
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(
      createSuccessResponse({ teams: mockTeams })
    );
    
    // Act
    const result = await enhancedClient.safeTeams();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTeams);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query Teams'),
      { filter: undefined, first: 50, after: undefined, includeArchived: false }
    );
  });
  
  // With filter
  it('should apply filter correctly', async () => {
    // Arrange
    const mockTeams = createMockTeamsConnection();
    const filter: LinearDocument.TeamFilter = {
      name: { contains: 'Test' }
    };
    
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(
      createSuccessResponse({ teams: mockTeams })
    );
    
    // Act
    const result = await enhancedClient.safeTeams(filter);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTeams);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filter })
    );
  });
  
  // Error from API
  it('should handle API errors gracefully', async () => {
    // Arrange
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API error', LinearErrorType.NetworkError)
    );
    
    // Act
    const result = await enhancedClient.safeTeams();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.NetworkError);
    expect(result.error?.message).toContain('API error');
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
  });
}); 