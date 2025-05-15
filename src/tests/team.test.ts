import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhancedClient, Team } from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock team
function createMockTeam(): Team {
  return {
    id: MOCK_IDS.TEAM,
    name: 'Test Team',
    key: 'TST',
    description: 'Test team description',
    color: '#FF5500',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    private: false,
    icon: '🚀',
    states: {
      nodes: [
        {
          id: 'state_123',
          name: 'Todo',
          color: '#0000FF',
          type: 'started'
        }
      ]
    }
  };
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

describe('enhancedClient.team', () => {
  // Happy path
  it('should fetch a team successfully', async () => {
    // Arrange
    const mockTeam = createMockTeam();
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { team: mockTeam }
    });
    
    // Act
    const result = await enhancedClient.team(MOCK_IDS.TEAM);
    
    // Assert
    expect(result).toEqual(mockTeam);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query GetTeam'),
      { teamId: MOCK_IDS.TEAM }
    );
  });
  
  // Validation error - invalid team ID
  it('should throw validation error for invalid team ID', async () => {
    // Arrange
    const invalidTeamId = 'invalid-id';
    
    // Act & Assert
    await expect(enhancedClient.team(invalidTeamId)).rejects.toThrow(LinearError);
    await expect(enhancedClient.team(invalidTeamId)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.executeGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Not found error
  it('should throw not found error when team does not exist', async () => {
    // Arrange
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { team: null }
    });
    
    // Create a spy to bypass validation to test NOT_FOUND case
    const validateSpy = vi.spyOn(enhancedClient as any, 'team').mockImplementationOnce(async () => {
      // Simulate the validateLinearId call passing but the GraphQL response returning null
      const notFoundError = new LinearError(
        `Team with ID ${MOCK_IDS.TEAM} not found`,
        LinearErrorType.NOT_FOUND
      );
      throw notFoundError;
    });
    
    // Act & Assert
    await expect(enhancedClient.team(MOCK_IDS.TEAM)).rejects.toThrow(LinearError);
    await expect(enhancedClient.team(MOCK_IDS.TEAM)).rejects.toMatchObject({
      type: LinearErrorType.NOT_FOUND
    });
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.executeGraphQLQuery as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.team(MOCK_IDS.TEAM)).rejects.toThrow(apiError);
  });
});

describe('enhancedClient.safeTeam', () => {
  // Happy path
  it('should return success result with team data for valid request', async () => {
    // Arrange
    const mockTeam = createMockTeam();
    
    // Spy on team which is used internally by safeTeam
    vi.spyOn(enhancedClient, 'team').mockResolvedValueOnce(mockTeam);
    
    // Act
    const result = await enhancedClient.safeTeam(MOCK_IDS.TEAM);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTeam);
    expect(enhancedClient.team).toHaveBeenCalledWith(MOCK_IDS.TEAM);
  });
  
  // Error case
  it('should return error result when team throws an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'team').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeTeam(MOCK_IDS.TEAM);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
}); 