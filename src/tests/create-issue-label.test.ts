import { IssueLabelPayload, LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import {
    createSuccessResponse,
    mockApiResponses,
    mockTeamData,
    TEST_IDS
} from './utils/test-utils.js';

// Helper to create a mock label
function createMockIssueLabelPayload(): IssueLabelPayload {
  return {
    success: true,
    issueLabel: {
      id: TEST_IDS.LABEL,
      name: 'Test Label',
      color: '#FF5500',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team: {
        id: TEST_IDS.TEAM,
        name: mockTeamData.name,
        key: mockTeamData.key
      }
    },
    lastSyncId: 12345
  } as unknown as IssueLabelPayload;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Set up global spies for methods we need to check in all tests
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeCreateIssueLabel', () => {
  // Happy path
  it('should create an issue label successfully', async () => {
    // Arrange
    const mockPayload = createMockIssueLabelPayload();
    const input: LinearDocument.IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: TEST_IDS.TEAM
    };
    
    // Mock the underlying GraphQL method that safeCreateIssueLabel uses
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      createSuccessResponse({ issueLabelCreate: mockPayload })
    );
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation CreateIssueLabel'),
      { input }
    );
  });
  
  // Validation error - missing name
  it('should return error result for missing name', async () => {
    // Arrange
    const input = {
      color: '#FF5500',
      teamId: TEST_IDS.TEAM
    } as LinearDocument.IssueLabelCreateInput;
    
    // Act 
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - missing color
  it('should return error result for missing color', async () => {
    // Arrange
    const input = {
      name: 'Test Label',
      teamId: TEST_IDS.TEAM
    } as LinearDocument.IssueLabelCreateInput;
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Error from API
  it('should handle API errors gracefully', async () => {
    // Arrange
    const input: LinearDocument.IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: TEST_IDS.TEAM
    };
    
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API error', LinearErrorType.NetworkError)
    );
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe(LinearErrorType.NetworkError);
    expect(result.error?.message).toContain('API error');
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
  });
});
