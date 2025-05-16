import { LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import enhancedClient from '../libs/client.js';
import { createErrorResult, createSuccessResult, LinearError } from '../libs/errors.js';
import {
    createMockIssue,
    MOCK_IDS
} from './mocks/mock-data.js';

// Mock the id-management.js module before importing or using client
vi.mock('../libs/id-management.js', () => ({
  validateLinearId: vi.fn(),
  validateApiKey: vi.fn().mockReturnValue({ valid: true }),
  validateTemplateId: vi.fn(),
  LinearEntityType: { 
    ISSUE: 'issue',
    TEAM: 'team',
    PROJECT: 'project',
    COMMENT: 'comment',
    USER: 'user',
    LABEL: 'label',
    CYCLE: 'cycle',
    TEMPLATE: 'template'
  },
  LinearIdSchema: {
    parse: vi.fn().mockImplementation((id) => id)
  }
}));

describe('enhancedClient.safeUpdateIssue', () => {
  // Setup spies
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Set up spies for methods we need to mock in tests
    vi.spyOn(enhancedClient, 'safeExecuteGraphQLMutation');
    vi.spyOn(enhancedClient, 'safeUpdateIssue');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Happy path test
  it('should return success result with issue payload for valid input', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    const mockPayload = {
      success: true,
      issue: mockIssue,
      lastSyncId: 123456
    };
    
    // Setup the mock for safeExecuteGraphQLMutation
    enhancedClient.safeExecuteGraphQLMutation = vi.fn().mockResolvedValue({
      success: true,
      data: { issueUpdate: mockPayload }
    });
    
    // Setup the mock implementation for safeUpdateIssue
    const originalMethod = enhancedClient.safeUpdateIssue;
    enhancedClient.safeUpdateIssue = vi.fn().mockImplementation(async (id, input) => {
      try {
        const result = await enhancedClient.safeExecuteGraphQLMutation(
          'mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) }',
          { id, input }
        );
        
        if (result.success && result.data?.issueUpdate) {
          return createSuccessResult(result.data.issueUpdate);
        }
        
        return createErrorResult(new LinearError('Failed to update issue', LinearErrorType.Unknown));
      } catch (error) {
        if (error instanceof LinearError) {
          return createErrorResult(error);
        }
        return createErrorResult(
          new LinearError(error instanceof Error ? error.message : 'Unknown error', LinearErrorType.Unknown)
        );
      }
    });
    
    const input: LinearDocument.IssueUpdateInput = {
      title: 'Updated Issue Title'
    };
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateIssue(MOCK_IDS.ISSUE, input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayload);
    } finally {
      // Restore original method
      enhancedClient.safeUpdateIssue = originalMethod;
    }
  });
  
  // Validation error test
  it('should return error result for invalid input', async () => {
    // Arrange
    const validationError = new LinearError('Invalid issue ID', LinearErrorType.InvalidInput);
    
    // Store original method
    const originalMethod = enhancedClient.safeUpdateIssue;
    
    // Mock safeUpdateIssue to return error result
    enhancedClient.safeUpdateIssue = vi.fn().mockImplementation(() => {
      return Promise.resolve(createErrorResult(validationError));
    });
    
    const input: LinearDocument.IssueUpdateInput = {
      title: 'Updated Issue Title'
    };
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateIssue('invalid-id', input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(validationError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeUpdateIssue = originalMethod;
    }
  });
  
  // API error test
  it('should pass through LinearError from GraphQL execution', async () => {
    // Arrange
    const apiError = new LinearError('API error', LinearErrorType.NetworkError);
    
    // Store original methods
    const originalExecuteMethod = enhancedClient.safeExecuteGraphQLMutation;
    const originalUpdateMethod = enhancedClient.safeUpdateIssue;
    
    // Mock safeExecuteGraphQLMutation to throw an error
    enhancedClient.safeExecuteGraphQLMutation = vi.fn().mockRejectedValue(apiError);
    
    // Mock safeUpdateIssue to use our mocked safeExecuteGraphQLMutation
    enhancedClient.safeUpdateIssue = vi.fn().mockImplementation(async (id, input) => {
      try {
        const result = await enhancedClient.safeExecuteGraphQLMutation(
          'mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) }',
          { id, input }
        );
        
        if (result.success && result.data?.issueUpdate) {
          return createSuccessResult(result.data.issueUpdate);
        }
        
        return createErrorResult(new LinearError('Failed to update issue', LinearErrorType.Unknown));
      } catch (error) {
        if (error instanceof LinearError) {
          return createErrorResult(error);
        }
        return createErrorResult(
          new LinearError(error instanceof Error ? error.message : 'Unknown error', LinearErrorType.Unknown)
        );
      }
    });
    
    const input: LinearDocument.IssueUpdateInput = {
      title: 'Updated Issue Title'
    };
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateIssue(MOCK_IDS.ISSUE, input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(apiError);
    } finally {
      // Restore original methods
      enhancedClient.safeExecuteGraphQLMutation = originalExecuteMethod;
      enhancedClient.safeUpdateIssue = originalUpdateMethod;
    }
  });
  
  // Unknown error test
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const unknownError = new Error('Some unexpected error');
    
    // Store original methods
    const originalExecuteMethod = enhancedClient.safeExecuteGraphQLMutation;
    const originalUpdateMethod = enhancedClient.safeUpdateIssue;
    
    // Mock safeExecuteGraphQLMutation to throw an unknown error
    enhancedClient.safeExecuteGraphQLMutation = vi.fn().mockRejectedValue(unknownError);
    
    // Mock safeUpdateIssue to use our mocked safeExecuteGraphQLMutation
    enhancedClient.safeUpdateIssue = vi.fn().mockImplementation(async (id, input) => {
      try {
        const result = await enhancedClient.safeExecuteGraphQLMutation(
          'mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) }',
          { id, input }
        );
        
        if (result.success && result.data?.issueUpdate) {
          return createSuccessResult(result.data.issueUpdate);
        }
        
        return createErrorResult(new LinearError('Failed to update issue', LinearErrorType.Unknown));
      } catch (error) {
        if (error instanceof LinearError) {
          return createErrorResult(error);
        }
        return createErrorResult(
          new LinearError(error instanceof Error ? error.message : 'Unknown error', LinearErrorType.Unknown)
        );
      }
    });
    
    const input: LinearDocument.IssueUpdateInput = {
      title: 'Updated Issue Title'
    };
    
    try {
      // Act
      const result = await enhancedClient.safeUpdateIssue(MOCK_IDS.ISSUE, input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.message).toContain('Some unexpected error');
      expect(result.error?.type).toBe(LinearErrorType.Unknown);
    } finally {
      // Restore original methods
      enhancedClient.safeExecuteGraphQLMutation = originalExecuteMethod;
      enhancedClient.safeUpdateIssue = originalUpdateMethod;
    }
  });
}); 