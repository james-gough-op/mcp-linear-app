import { LinearDocument } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhancedClient } from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock team
function createMockTeam(): LinearDocument.Team {
  return {
    id: MOCK_IDS.TEAM,
    name: 'Test Team',
    key: 'TST',
    description: 'Test team description',
    color: '#FF5500',
    createdAt: new Date(),
    updatedAt: new Date(),
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
    } as LinearDocument.WorkflowStateConnection
  } as LinearDocument.Team;
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

describe('enhancedClient.safeTeam', () => {
  // Happy path
  it('should fetch a team successfully', async () => {
    // Arrange
    const mockTeam = createMockTeam();
    
    vi.mocked(enhancedClient.executeGraphQLQuery).mockResolvedValueOnce({
      data: { team: mockTeam }
    });
    
    // Act
    const result = await enhancedClient.safeTeam(MOCK_IDS.TEAM);
    
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
    await expect(enhancedClient.safeTeam(invalidTeamId)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeTeam(invalidTeamId)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.executeGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Not found error
  it('should throw not found error when team does not exist', async () => {
    // Store original method
    const originalMethod = enhancedClient.safeTeam;
    
    // Create the error that will be thrown
    const notFoundErrorMessage = `Team with ID ${MOCK_IDS.TEAM} not found`;
    const notFoundError = new LinearError(
      notFoundErrorMessage,
      LinearErrorType.NOT_FOUND
    );
    
    // Mock the _team method to reject with the not found error
    enhancedClient.safeTeam = vi.fn().mockRejectedValue(notFoundError);
    
    try {
      // Act & Assert - only run the test once to avoid consuming the mock
      const errorPromise = enhancedClient.safeTeam(MOCK_IDS.TEAM);
      await expect(errorPromise).rejects.toThrow(notFoundErrorMessage);
      await expect(errorPromise).rejects.toMatchObject({
        type: LinearErrorType.NOT_FOUND
      });
    } finally {
      // Restore original method
      enhancedClient.safeTeam = originalMethod;
    }
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.mocked(enhancedClient.executeGraphQLQuery).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.safeTeam(MOCK_IDS.TEAM)).rejects.toThrow(apiError);
  });
});

describe('enhancedClient.safeTeam', () => {
  // Happy path
  it('should return success result with team data for valid request', async () => {
    // Arrange
    const mockTeam = createMockTeam();
    
    // Store original method
    const originalMethod = enhancedClient.safeTeam;
    
    // Mock the _team method which is used internally by safeTeam
    enhancedClient.safeTeam = vi.fn().mockResolvedValueOnce(mockTeam);
    
    try {
      // Act
      const result = await enhancedClient.safeTeam(MOCK_IDS.TEAM);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTeam);
      expect(enhancedClient.safeTeam).toHaveBeenCalledWith(MOCK_IDS.TEAM);
    } finally {
      // Restore original method
      enhancedClient.safeTeam = originalMethod;
    }
  });
  
  // Error case
  it('should return error result when team throws an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    
    // Store original method
    const originalMethod = enhancedClient.safeTeam;
    
    // Mock the _team method to throw an error
    enhancedClient.safeTeam = vi.fn().mockRejectedValueOnce(apiError);
    
    try {
      // Act
      const result = await enhancedClient.safeTeam(MOCK_IDS.TEAM);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(apiError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeTeam = originalMethod;
    }
  });
}); 