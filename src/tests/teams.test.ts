import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamConnection, TeamFilter } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock teams response
function createMockTeamsConnection(): TeamConnection {
  return {
    nodes: [
      {
        id: MOCK_IDS.TEAM,
        name: 'Test Team',
        key: 'TST',
        description: 'Test team description',
        color: '#FF5500',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'cursor1',
      endCursor: 'cursor1'
    }
  } as unknown as TeamConnection;
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

describe('enhancedClient.teams', () => {
  // Happy path
  it('should fetch teams successfully', async () => {
    // Arrange
    const mockTeams = createMockTeamsConnection();
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { teams: mockTeams }
    });
    
    // Act
    const result = await enhancedClient.teams();
    
    // Assert
    expect(result).toEqual(mockTeams);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query Teams'),
      { filter: undefined, first: 50, after: undefined, includeArchived: false }
    );
  });
  
  // With filter
  it('should apply filter correctly', async () => {
    // Arrange
    const mockTeams = createMockTeamsConnection();
    const filter: TeamFilter = {
      name: { contains: 'Test' }
    };
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { teams: mockTeams }
    });
    
    // Act
    const result = await enhancedClient.teams(filter);
    
    // Assert
    expect(result).toEqual(mockTeams);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filter })
    );
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.executeGraphQLQuery as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.teams()).rejects.toThrow(apiError);
  });
});

describe('enhancedClient.safeTeams', () => {
  // Happy path
  it('should return success result with teams data for valid request', async () => {
    // Arrange
    const mockTeams = createMockTeamsConnection();
    
    // Spy on teams which is used internally by safeTeams
    vi.spyOn(enhancedClient, 'teams').mockResolvedValueOnce(mockTeams);
    
    // Act
    const result = await enhancedClient.safeTeams();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTeams);
    expect(enhancedClient.teams).toHaveBeenCalled();
  });
  
  // Error case
  it('should return error result when teams throws an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'teams').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeTeams();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
}); 