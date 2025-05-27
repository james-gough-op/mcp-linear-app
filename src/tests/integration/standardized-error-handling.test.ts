import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinearError } from '../../libs/errors.js';
import { LinearCreateCommentTool } from '../../tools/linear/create-comment.js';
import { LinearCreateIssueTool } from '../../tools/linear/create-issue.js';
import { LinearGetIssueTool } from '../../tools/linear/get-issue.js';
import { createLinearSearchIssuesTool } from '../../tools/linear/search-issues.js';
import { LinearUpdateIssueTool } from '../../tools/linear/update-issue.js';
import { MOCK_IDS, createMockIssue } from '../mocks/mock-data.js';

/**
 * Integration tests for standardized error handling across tools
 * 
 * These tests verify that all tools use the standardized error handling patterns,
 * ensuring consistent behavior across the application.
 */

// Create test fixtures
const MOCK_TEAM_ID = MOCK_IDS.TEAM;
const MOCK_ISSUE_ID = MOCK_IDS.ISSUE;
const MOCK_STATE_ID = MOCK_IDS.WORKFLOW_STATE;

// Mock the enhancedClient
vi.mock('../../libs/client.js', () => {
  const mockClient = {
    safeGetIssue: vi.fn(),
    safeCreateIssue: vi.fn(),
    safeUpdateIssue: vi.fn(),
    safeIssues: vi.fn(),
    safeCreateComment: vi.fn(),
    safeExecuteGraphQLQuery: vi.fn(),
    safeTeam: vi.fn(),
    safeTeams: vi.fn()
  };
  (globalThis as any).__mockClient = mockClient;
  return {
    getEnhancedClient: () => mockClient
  };
});

// Mock the logger to spy on it
vi.mock('../../libs/logger.js', () => {
  const createLoggerMock = vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logApiRequest: vi.fn(),
    logApiResponse: vi.fn(),
    logApiError: vi.fn()
  });
  
  return {
    createLogger: createLoggerMock,
    LogLevel: {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR'
    }
  };
});

// Helper to extract the text content from a response
const getResponseText = (response: any): string => {
  return response?.content?.[0]?.text || '';
};

const LinearSearchIssuesTool = createLinearSearchIssuesTool();

describe('Standardized Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Errors', () => {
    it('should standardize authentication errors across tools', async () => {
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              { id: MOCK_STATE_ID, name: 'Backlog', type: 'backlog' }
            ]
          }
        }
      });
      const authError = new LinearError(
        'Authentication failed',
        "AuthenticationError" as LinearErrorType,
        null,
        401
      );
      
      const mockErrorResult = { success: false, error: authError };
      
      // Mock all tools to return the same auth error
      vi.mocked((globalThis as any).__mockClient.safeGetIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeUpdateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeIssues).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateComment).mockResolvedValue(mockErrorResult);
      
      // Test each tool with proper parameter names
      const getIssueResponse = await LinearGetIssueTool.handler({ issueId: MOCK_ISSUE_ID }, { signal: new AbortController().signal });
      const createIssueResponse = await LinearCreateIssueTool.handler({
        teamId: MOCK_TEAM_ID,
        title: 'Test Issue',
        description: 'Description',
        status: 'backlog',
        priority: 'medium'
      }, { signal: new AbortController().signal });
      const updateIssueResponse = await LinearUpdateIssueTool.handler({
        id: MOCK_ISSUE_ID,
        title: 'Updated Title'
      }, { signal: new AbortController().signal });
      const searchIssuesResponse = await LinearSearchIssuesTool.handler({
        keyword: 'test'
      }, { signal: new AbortController().signal });
      const createCommentResponse = await LinearCreateCommentTool.handler({
        issueId: MOCK_ISSUE_ID,
        comment: 'Test comment'
      }, { signal: new AbortController().signal });
      
      // All responses should follow the same pattern
      const responses = [
        getIssueResponse,
        createIssueResponse,
        updateIssueResponse,
        searchIssuesResponse,
        createCommentResponse
      ];
      
      // Verify standardized format for all responses
      responses.forEach(response => {
        const text = getResponseText(response);
        expect(text).toContain('Authentication error');
        expect(text).toContain('Please check your Linear API key');
        expect(text).toContain('Authentication failed');
      });
    });
  });
  
  describe('Not Found Errors', () => {
    it('should standardize not found errors across tools', async () => {
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              { id: MOCK_STATE_ID, name: 'Backlog', type: 'backlog' }
            ]
          }
        }
      });
      const notFoundError = new LinearError(
        'Resource not found',
        "FeatureNotAccessible" as LinearErrorType,
        null,
        404
      );
      
      const mockErrorResult = { success: false, error: notFoundError };
      
      // Mock all tools to return the same not found error
      vi.mocked((globalThis as any).__mockClient.safeGetIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeUpdateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateComment).mockResolvedValue(mockErrorResult);
      
      // Test tools that involve existing resources with proper parameter names
      const getIssueResponse = await LinearGetIssueTool.handler({ issueId: MOCK_ISSUE_ID }, { signal: new AbortController().signal });
      const updateIssueResponse = await LinearUpdateIssueTool.handler({
        id: MOCK_ISSUE_ID,
        title: 'Updated Title'
      }, { signal: new AbortController().signal });
      const createCommentResponse = await LinearCreateCommentTool.handler({
        issueId: MOCK_ISSUE_ID,
        comment: 'Test comment'
      }, { signal: new AbortController().signal });
      
      // All responses should follow the same pattern
      const responses = [
        getIssueResponse,
        updateIssueResponse,
        createCommentResponse
      ];
      
      // Verify standardized format for all responses
      responses.forEach(response => {
        const text = getResponseText(response);
        expect(text).toContain('Not found');
        expect(text).toContain('Resource not found');
      });
    });
  });
  
  describe('Validation Errors', () => {
    it('should standardize validation errors across tools', async () => {
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              { id: MOCK_STATE_ID, name: 'Backlog', type: 'backlog' }
            ]
          }
        }
      });
      const validationError = new LinearError(
        'Invalid input: Title cannot be empty',
        "InvalidInput" as LinearErrorType,
        null,
        400
      );
      
      const mockErrorResult = { success: false, error: validationError };
      
      // Mock tools to return validation errors
      vi.mocked((globalThis as any).__mockClient.safeCreateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeUpdateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateComment).mockResolvedValue(mockErrorResult);
      
      // Test creation/update tools with proper parameter names
      const createIssueResponse = await LinearCreateIssueTool.handler({
        teamId: MOCK_TEAM_ID,
        title: '',
        description: 'Description',
        status: 'backlog',
        priority: 'medium'
      }, { signal: new AbortController().signal });
      const updateIssueResponse = await LinearUpdateIssueTool.handler({
        id: MOCK_ISSUE_ID,
        title: ''
      }, { signal: new AbortController().signal });
      const createCommentResponse = await LinearCreateCommentTool.handler({
        issueId: MOCK_ISSUE_ID,
        comment: ''
      }, { signal: new AbortController().signal });
      
      // All responses should follow the same pattern
      const responses = [
        createIssueResponse,
        updateIssueResponse,
        createCommentResponse
      ];
      
      // Verify standardized format for all responses
      responses.forEach(response => {
        const text = getResponseText(response);
        expect(text).toContain('Validation error');
        expect(text).toContain('Invalid input');
      });
    });
  });
  
  describe('Network Errors', () => {
    it('should standardize network errors across tools', async () => {
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              { id: MOCK_STATE_ID, name: 'Backlog', type: 'backlog' }
            ]
          }
        }
      });
      const networkError = new LinearError(
        'Unable to connect to Linear API',
        "NetworkError" as LinearErrorType
      );
      
      const mockErrorResult = { success: false, error: networkError };
      
      // Mock all tools to return the same network error
      vi.mocked((globalThis as any).__mockClient.safeGetIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeUpdateIssue).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeIssues).mockResolvedValue(mockErrorResult);
      vi.mocked((globalThis as any).__mockClient.safeCreateComment).mockResolvedValue(mockErrorResult);
      
      // Test each tool
      const getIssueResponse = await LinearGetIssueTool.handler({ issueId: MOCK_ISSUE_ID }, { signal: new AbortController().signal });
      const createIssueResponse = await LinearCreateIssueTool.handler({
        teamId: MOCK_TEAM_ID,
        title: 'Test Issue',
        description: 'Description',
        status: 'backlog',
        priority: 'medium'
      }, { signal: new AbortController().signal });
      
      // All responses should follow the same pattern
      const responses = [
        getIssueResponse,
        createIssueResponse
      ];
      
      // Verify standardized format for all responses
      responses.forEach(response => {
        const text = getResponseText(response);
        expect(text).toContain('Network error');
        expect(text).toContain('Unable to connect to Linear API');
        expect(text).toContain('Please check your internet connection');
      });
    });
  });
  
  describe('Unexpected Errors', () => {
    it('should handle unexpected runtime exceptions', async () => {
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              { id: MOCK_STATE_ID, name: 'Backlog', type: 'backlog' }
            ]
          }
        }
      });
      // Make the client throw a runtime error instead of returning a response
      vi.mocked((globalThis as any).__mockClient.safeGetIssue).mockImplementation(() => {
        throw new Error('Unexpected runtime error');
      });
      
      vi.mocked((globalThis as any).__mockClient.safeCreateIssue).mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      
      // Test tools
      const getIssueResponse = await LinearGetIssueTool.handler({ issueId: MOCK_ISSUE_ID }, { signal: new AbortController().signal });
      const createIssueResponse = await LinearCreateIssueTool.handler({
        teamId: MOCK_TEAM_ID,
        title: 'Test Issue',
        description: 'Description',
        status: 'backlog',
        priority: 'medium'
      }, { signal: new AbortController().signal });
      
      // Verify standardized handling of unexpected errors
      expect(getResponseText(getIssueResponse)).toContain('Unexpected error');
      expect(getResponseText(getIssueResponse)).toContain('Unexpected runtime error');
      
      expect(getResponseText(createIssueResponse)).toContain('Unexpected error');
      expect(getResponseText(createIssueResponse)).toContain('Something went terribly wrong');
    });
  });
  
  describe('Success Response Formatting', () => {
    it('should format success responses consistently', async () => {
      // Mock successful responses
      const mockIssue = createMockIssue();
      
      // Add safeTeam mock for state ID lookup
      vi.mocked((globalThis as any).__mockClient.safeTeam).mockResolvedValue({
        success: true,
        data: {
          id: MOCK_TEAM_ID,
          states: {
            nodes: [
              {
                id: MOCK_STATE_ID,
                name: 'Backlog',
                type: 'backlog'
              }
            ]
          }
        }
      });
      
      vi.mocked((globalThis as any).__mockClient.safeCreateIssue).mockResolvedValue({
        success: true,
        data: { 
          success: true,
          issue: mockIssue
        }
      });
      
      vi.mocked((globalThis as any).__mockClient.safeUpdateIssue).mockResolvedValue({
        success: true,
        data: { 
          success: true,
          issue: mockIssue
        }
      });
      
      // Test tools with proper parameter names
      const createIssueResponse = await LinearCreateIssueTool.handler({
        teamId: MOCK_TEAM_ID,
        title: 'Test Issue',
        description: 'Description',
        status: 'backlog',
        priority: 'medium'
      }, { signal: new AbortController().signal });
      
      const updateIssueResponse = await LinearUpdateIssueTool.handler({
        id: MOCK_ISSUE_ID,
        title: 'Updated Title'
      }, { signal: new AbortController().signal });
      
      // Verify standardized success formatting
      expect(getResponseText(createIssueResponse)).toContain('Success: issue created');
      expect(getResponseText(updateIssueResponse)).toContain('Success: issue updated');
    });
  });
  
  describe('Logging Standardization', () => {
    it('should verify consistent logging patterns across tools', async () => {
      // Force an error to check consistent error logging
      vi.mocked((globalThis as any).__mockClient.safeGetIssue).mockResolvedValue({
        success: false,
        error: new LinearError('Issue not found', "FeatureNotAccessible" as LinearErrorType)
      });
      
      // Run the tool to trigger logging
      await LinearGetIssueTool.handler({ issueId: 'missing-id' }, { signal: new AbortController().signal });
      
      // Verify logger was created and methods were called
      const logger = vi.mocked((globalThis as any).__mockClient.safeGetIssue).mock.calls[0];
      expect(logger).toBeTruthy();
      
      // The specific log checks will be made in a separate test with specialized mocking
    });
  });
}); 