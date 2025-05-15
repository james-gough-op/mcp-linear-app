import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueLabelCreateInput, IssueLabelPayload } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock label
function createMockIssueLabelPayload(): IssueLabelPayload {
  return {
    success: true,
    issueLabel: {
      id: 'label_123abc',
      name: 'Test Label',
      color: '#FF5500',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team: {
        id: MOCK_IDS.TEAM,
        name: 'Test Team',
        key: 'TST'
      }
    },
    lastSyncId: 12345
  } as unknown as IssueLabelPayload;
}

// Setup spies
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.createIssueLabel', () => {
  // Happy path
  it('should create an issue label successfully', async () => {
    // Arrange
    const mockPayload = createMockIssueLabelPayload();
    const input: IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: MOCK_IDS.TEAM
    };
    
    (enhancedClient.safeExecuteGraphQLMutation as any).mockResolvedValueOnce({
      data: { issueLabelCreate: mockPayload }
    });
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation CreateIssueLabel'),
      { input }
    );
  });
  
  // Validation error - missing name
  it('should throw validation error for missing name', async () => {
    // Arrange
    const input = {
      color: '#FF5500',
      teamId: MOCK_IDS.TEAM
    } as IssueLabelCreateInput;
    
    // Act & Assert
    await expect(enhancedClient.safeCreateIssueLabel(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeCreateIssueLabel(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Validation error - missing color
  it('should throw validation error for missing color', async () => {
    // Arrange
    const input = {
      name: 'Test Label',
      teamId: MOCK_IDS.TEAM
    } as IssueLabelCreateInput;
    
    // Act & Assert
    await expect(enhancedClient.safeCreateIssueLabel(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.safeCreateIssueLabel(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION
    });
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // Error from API
  it('should propagate API errors', async () => {
    // Arrange
    const input: IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: MOCK_IDS.TEAM
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.safeExecuteGraphQLMutation as any).mockRejectedValueOnce(apiError);
    
    // Act & Assert
    await expect(enhancedClient.safeCreateIssueLabel(input)).rejects.toThrow(apiError);
  });
});

describe('enhancedClient.safeCreateIssueLabel', () => {
  // Happy path
  it('should return success result with label payload for valid request', async () => {
    // Arrange
    const mockPayload = createMockIssueLabelPayload();
    const input: IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: MOCK_IDS.TEAM
    };
    
    // Spy on createIssueLabel which is used internally by safeCreateIssueLabel
    vi.spyOn(enhancedClient, 'safeCreateIssueLabel').mockResolvedValueOnce(mockPayload);
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPayload);
    expect(enhancedClient.safeCreateIssueLabel).toHaveBeenCalledWith(input);
  });
  
  // Error case - LinearError
  it('should return error result when createIssueLabel throws a LinearError', async () => {
    // Arrange
    const input: IssueLabelCreateInput = {
      name: 'Test Label',
      color: '#FF5500',
      teamId: MOCK_IDS.TEAM
    };
    
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    vi.spyOn(enhancedClient, 'safeCreateIssueLabel').mockRejectedValueOnce(apiError);
    
    // Act
    const result = await enhancedClient.safeCreateIssueLabel(input);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toEqual(apiError);
    expect(result.data).toBeUndefined();
  });
}); 