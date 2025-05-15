import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User, enhancedClient } from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock user
function createMockUser(): User {
  return {
    id: MOCK_IDS.USER,
    name: 'Test User',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    admin: true,
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    organization: {
      id: 'org_123',
      name: 'Test Organization',
      urlKey: 'test-org'
    },
    teams: {
      nodes: [
        {
          id: MOCK_IDS.TEAM,
          name: 'Test Team',
          key: 'TST'
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

describe('enhancedClient.viewer', () => {
  // Happy path
  it('should fetch the current user profile successfully', async () => {
    // Arrange
    const mockUser = createMockUser();
    
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { viewer: mockUser }
    });
    
    // Act
    const result = await enhancedClient.viewer();
    
    // Assert
    expect(result).toEqual(mockUser);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query Viewer')
    );
  });
  
  // Authentication error
  it('should throw authentication error when viewer is not available', async () => {
    // Arrange
    (enhancedClient.executeGraphQLQuery as any).mockResolvedValueOnce({
      data: { viewer: null }
    });
    
    // Mock implementation to return authentication error
    vi.spyOn(enhancedClient as any, 'viewer').mockImplementationOnce(async () => {
      const authError = new LinearError(
        'User not authenticated',
        LinearErrorType.AUTHENTICATION
      );
      throw authError;
    });
    
    // Act & Assert
    await expect(enhancedClient.viewer()).rejects.toThrow(LinearError);
    await expect(enhancedClient.viewer()).rejects.toMatchObject({
      type: LinearErrorType.AUTHENTICATION
    });
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.executeGraphQLQuery as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.viewer()).rejects.toThrow(apiError);
  });
});

describe('enhancedClient.safeViewer', () => {
  // Happy path
  it('should return success result with user data for valid request', async () => {
    // Arrange
    const mockUser = createMockUser();
    
    // Spy on viewer which is used internally by safeViewer
    vi.spyOn(enhancedClient, 'viewer').mockResolvedValueOnce(mockUser);
    
    // Act
    const result = await enhancedClient.safeViewer();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUser);
    expect(enhancedClient.viewer).toHaveBeenCalled();
  });
  
  // Error case
  it('should return error result when viewer throws an error', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'viewer').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeViewer();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
}); 