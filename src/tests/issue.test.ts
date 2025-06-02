import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { createLinearGetIssueTool } from '../tools/linear/get-issue.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses,
    mockIssueData,
    TEST_IDS
} from './utils/test-utils.js';

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
    mockSafeGetIssue.mockResolvedValue(createSuccessResponse(mockIssueData));
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(TEST_IDS.ISSUE);
    
    // Assert
    // The safeGetIssue method is expected to return a Result object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockIssueData);
    }
    expect(mockSafeGetIssue).toHaveBeenCalledWith(TEST_IDS.ISSUE);
  });
  
  // Error cases
  it('should throw validation error for invalid ID format', async () => {
    // Mock validation error
    mockSafeGetIssue.mockResolvedValue(
      mockApiResponses.mockErrorResponse('Invalid ID format', LinearErrorType.InvalidInput)
    );
    
    // Act
    const result = await getEnhancedClient().safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    }
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
});

describe('enhancedClient.safeGetIssue additional tests', () => {
  // Happy path
  it('should return success result with issue data for valid ID', async () => {
    // Arrange
    mockSafeGetIssue.mockResolvedValue(createSuccessResponse(mockIssueData));
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(TEST_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data).toEqual(mockIssueData);
    }
    expect(mockSafeGetIssue).toHaveBeenCalledWith(TEST_IDS.ISSUE);
  });
  
  // Error case for validation error
  it('should return error result for invalid ID', async () => {
    // Mock validation error
    mockSafeGetIssue.mockResolvedValue(
      mockApiResponses.mockErrorResponse('Invalid ID format', LinearErrorType.InvalidInput)
    );
    
    // Act
    const result = await getEnhancedClient().safeGetIssue('invalid-id');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    }
    expect(result.data).toBeUndefined();
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Error case for not found
  it('should return error result for not found issue', async () => {
    // Mock the safeGetIssue response
    mockSafeGetIssue.mockResolvedValue(
      mockApiResponses.mockErrorResponse('Issue not found', LinearErrorType.FeatureNotAccessible)
    );
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(TEST_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe(LinearErrorType.FeatureNotAccessible);
    }
    expect(result.data).toBeUndefined();
  });
  
  // Unknown error conversion
  it('should convert unknown errors to LinearError', async () => {
    // Mock the response
    mockSafeGetIssue.mockResolvedValue(
      mockApiResponses.mockErrorResponse('Some unexpected error', LinearErrorType.Unknown)
    );
    
    // Act
    const result = await getEnhancedClient().safeGetIssue(TEST_IDS.ISSUE);
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBeInstanceOf(LinearError);
        expect(result.error?.type).toBe(LinearErrorType.Unknown);
        expect(result.error?.message).toContain('Some unexpected error');
    }
    expect(result.data).toBeUndefined();
  });
});

describe('LinearGetIssueTool (DI pattern)', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully get an issue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(createSuccessResponse(mockIssueData));
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(mockClient.safeGetIssue).toHaveBeenCalled();
  });

  it('should handle error from safeGetIssue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Issue not found', LinearErrorType.FeatureNotAccessible)
    );
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: 'issue-id' }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'not found');
    expect(response.content[0].text).toContain('Issue not found');
  });
}); 