import { LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock user
function createMockUser(): LinearDocument.User {
  return {
    id: MOCK_IDS.USER,
    name: 'Test User',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    admin: true,
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeen: new Date(),
    organization: {
      id: MOCK_IDS.ORGANIZATION,
      name: 'Test Organization',
      urlKey: 'test-org',
      allowedAuthServices: [],
      createdAt: new Date(),
      createdIssueCount: 0,
      customerCount: 0,
    } as unknown as LinearDocument.Organization,
    teams: {
      nodes: [
        {
          id: MOCK_IDS.TEAM,
          name: 'Test Team',
          key: 'TST'
        } as unknown as LinearDocument.Team
      ]
    } as unknown as LinearDocument.TeamConnection
  } as unknown as LinearDocument.User;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLQuery');
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLQuery');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.viewer', () => {
  // Happy path
  it('should fetch the current user profile successfully', async () => {
    // Arrange
    const mockUser = createMockUser();
    
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce({
      success: true,
      data: { viewer: mockUser }
    });
    
    // Act
    const result = await enhancedClient.safeGetViewer();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUser);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
    
    // Just verify the function was called with a query containing the expected keywords
    const callArgs = vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mock.calls[0];
    expect(callArgs[0]).toContain('query Viewer');
    expect(callArgs[0]).toContain('viewer');
  });
  
  // Authentication error
  it('should return authentication error when viewer is not available', async () => {
    // Arrange
    const authError = new LinearError(
      'User not authenticated',
      LinearErrorType.AuthenticationError
    );
    
    // Mock the safeExecuteGraphQLQuery to return a failed result
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce({
      success: false,
      error: authError,
      data: undefined
    });
    
    // Act
    const result = await enhancedClient.safeGetViewer();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({
      type: LinearErrorType.AuthenticationError
    });
    expect(result.data).toBeUndefined();
  });
  
  // Error from API
  it('should handle API errors gracefully', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NetworkError);
    
    // Mock safeExecuteGraphQLQuery to return a failed result
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce({
      success: false,
      error: apiError,
      data: undefined
    });
    
    // Act
    const result = await enhancedClient.safeGetViewer();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
}); 