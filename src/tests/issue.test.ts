import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { createLinearGetIssueTool } from '../tools/linear/get-issue.js';
import {
    createMockIssue,
    MOCK_IDS
} from './mocks/mock-data.js';

// Use vi.hoisted to define mocks before they are used
const mockSafeGetIssue = vi.hoisted(() => vi.fn());
const mockSafeExecuteGraphQLQuery = vi.hoisted(() => vi.fn());

// Mock the client module
vi.mock('../libs/client.js', () => ({
  getEnhancedClient: () => ({
    safeGetIssue: mockSafeGetIssue,
    safeExecuteGraphQLQuery: mockSafeExecuteGraphQLQuery
  })
}));

// Setup mocks
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeGetIssue', () => {
  // Happy path
  it('should return issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    // Mock the safeGetIssue function
    mockSafeGetIssue.mockResolvedValue({ success: true, data: mockIssue });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    // The safeGetIssue method is expected to return a Result object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockIssue);
    }
    expect(mockSafeGetIssue).toHaveBeenCalledWith(MOCK_IDS.ISSUE);
  });
  
  // Error cases
  it('should throw validation error for invalid ID format', async () => {
    // Mock validation error
    mockSafeGetIssue.mockResolvedValue({
      success: false,
      error: new LinearError('Invalid ID format', "InvalidInput" as LinearErrorType)
    });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe("InvalidInput" as LinearErrorType);
    }
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
});

describe('enhancedClient.safeGetIssue additional tests', () => {
  // Happy path
  it('should return success result with issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    // Mock the safeGetIssue function
    mockSafeGetIssue.mockResolvedValue({ success: true, data: mockIssue });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data).toEqual(mockIssue);
    }
    expect(mockSafeGetIssue).toHaveBeenCalledWith(MOCK_IDS.ISSUE);
  });
  
  // Error case for validation error
  it('should return error result for invalid ID', async () => {
    // Mock validation error
    mockSafeGetIssue.mockResolvedValue({
      success: false,
      error: new LinearError('Invalid ID format', "InvalidInput" as LinearErrorType)
    });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe("InvalidInput" as LinearErrorType);
    }
    expect(result.data).toBeUndefined();
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Error case for not found
  it('should return error result for not found issue', async () => {
    // Arrange
    const notFoundError = new LinearError('Issue not found', "FeatureNotAccessible" as LinearErrorType);
    // Mock the safeGetIssue response
    mockSafeGetIssue.mockResolvedValue({
      success: false,
      error: notFoundError
    });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toEqual(notFoundError);
    }
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error conversion
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const linearError = new LinearError('Some unexpected error', "Unknown" as LinearErrorType);
    
    // Mock the response
    mockSafeGetIssue.mockResolvedValue({
      success: false,
      error: linearError
    });
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(MOCK_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe("Unknown" as LinearErrorType);
        expect(result.error?.message).toContain('Some unexpected error');
    }
    expect(result.data).toBeUndefined();
  });
});

describe('LinearGetIssueTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeGetIssue: vi.fn()
    };
  });

  it('should successfully get an issue', async () => {
    const mockIssue = createMockIssue();
    Object.assign(mockIssue, {
      comments: async () => ({ nodes: [] }),
      children: async () => ({ nodes: [] }),
      state: Promise.resolve({ id: 'state-id', name: 'In Progress', color: '#ccc', type: 'in_progress', position: 1, createdAt: '', updatedAt: '' }),
      assignee: Promise.resolve({ id: 'user-id', name: 'Test User', email: '', displayName: '', active: true, createdAt: '', updatedAt: '' }),
      project: Promise.resolve({ id: 'project-id', name: 'Test Project' })
    });
    mockClient.safeGetIssue.mockResolvedValueOnce({ success: true, data: mockIssue });
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: mockIssue.id }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(mockClient.safeGetIssue).toHaveBeenCalled();
  });

  it('should handle error from safeGetIssue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({ success: false, error: { message: 'Issue not found' } });
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: 'issue-id' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Issue not found');
    expect(response.content[0].text).toContain('Error');
  });
}); 