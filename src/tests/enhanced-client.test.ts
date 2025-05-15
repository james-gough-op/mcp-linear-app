import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueCreateInput } from '../generated/linear-types.js';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import {
    createMockIssue,
    MOCK_IDS
} from './mocks/mock-data.js';

// Setup mocks
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLMutation');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.createIssue', () => {
  // Happy path
  it('should return issue payload for valid input', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    const mockPayload = {
      success: true,
      issue: mockIssue
    };
    
    (enhancedClient.safeExecuteGraphQLMutation as any).mockResolvedValueOnce({
      data: { issueCreate: mockPayload }
    });
    
    const input: IssueCreateInput = {
      teamId: MOCK_IDS.TEAM,
      title: 'Test Issue'
    };
    
    // Act
    const result = await enhancedClient.createIssue(input);
    
    // Assert
    expect(result).toEqual(mockPayload);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation CreateIssue'), 
      { input }
    );
  });
  
  // Validation errors
  it('should throw validation error for missing teamId', async () => {
    // Arrange
    const input = {
      title: 'Test Issue'
    } as IssueCreateInput; // Type assertion to bypass compiler check for test
    
    // Act & Assert
    await expect(enhancedClient.createIssue(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.createIssue(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION,
      message: expect.stringContaining('Team ID is required')
    });
    
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  it('should throw validation error for missing title', async () => {
    // Arrange
    const input = {
      teamId: MOCK_IDS.TEAM
    } as IssueCreateInput; // Type assertion to bypass compiler check for test
    
    // Act & Assert
    await expect(enhancedClient.createIssue(input)).rejects.toThrow(LinearError);
    await expect(enhancedClient.createIssue(input)).rejects.toMatchObject({
      type: LinearErrorType.VALIDATION,
      message: expect.stringContaining('Title is required')
    });
    
    expect(enhancedClient.safeExecuteGraphQLMutation).not.toHaveBeenCalled();
  });
  
  // API error case
  it('should pass through LinearError from GraphQL execution', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NETWORK);
    (enhancedClient.safeExecuteGraphQLMutation as any).mockRejectedValueOnce(apiError);
    
    const input: IssueCreateInput = {
      teamId: MOCK_IDS.TEAM,
      title: 'Test Issue'
    };
    
    // Act & Assert
    await expect(enhancedClient.createIssue(input)).rejects.toThrow(apiError);
  });
}); 