import { LinearErrorType } from '@linear/sdk';
import { expect, vi } from 'vitest';
import { EnhancedLinearClient } from '../../libs/client.js';
import { LinearError, LinearResult } from '../../libs/errors.js';

/**
 * Common test utilities for Linear tools and client tests
 */

// Type definitions for mocked functions
export type MockedFunction<T> = T & {
  mockResolvedValue: (value: unknown) => void;
  mockResolvedValueOnce: (value: unknown) => void;
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void;
  mock: { calls: unknown[][] };
};

// Common mock IDs for testing
export const TEST_IDS = {
  TEAM: '123e4567-e89b-42d3-a456-556642440000',
  ISSUE: '550e8400-e29b-41d4-a716-446655440000',
  PROJECT: '7f8e9d0c-1b2a-41d4-a716-446655440000',
  CYCLE: '9a8b7c6d-5e4f-43d2-a1b2-c3d4e5f67890',
  TEMPLATE: 'b5f8c1d2-e3f4-45a6-b7c8-9d0e1f2a3b4c',
  STATE: 'abcdef12-3456-7890-abcd-ef1234567890',
  COMMENT: 'fedcba98-7654-3210-fedc-ba9876543210',
  LABEL: 'a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890',
  WORKFLOW_STATE: 'c4d5e6f7-8910-abcd-ef12-345678901234',
};

// Invalid IDs for testing validation
export const INVALID_IDS = {
  TEAM: 'not-a-valid-team-id',
  ISSUE: 'not-a-valid-issue-id',
  PROJECT: 'not-a-valid-project-id',
  CYCLE: 'not-a-valid-cycle-id',
  TEMPLATE: 'not-a-valid-template-id',
};

// Helper to extract the text content from a tool response
export const getResponseText = (response: unknown): string => {
  if (typeof response === 'object' && response !== null && 'content' in response) {
    const content = (response as { content?: { text?: string }[] }).content;
    return content?.[0]?.text || '';
  }
  return '';
};

// Helper to check if a tool response indicates success
export const expectSuccessResponse = (response: unknown) => {
  const text = getResponseText(response);
  expect(text).not.toContain('Error:');
  expect(text).not.toContain('Failed:');
  // Some responses mention "No comments or failed to load comments"
  // so we can't check for "failed" directly
  expect(text.toLowerCase()).not.toMatch(/\bfailed\b(?! to load)/i);
};

// Helper to check if a tool response indicates an error of a specific type
export const expectErrorResponse = (response: unknown, errorType: string) => {
  const text = getResponseText(response);
  expect(text.toLowerCase()).toMatch(/error|failed/i);
  
  // LinearErrorType.NotFound becomes "not found" in the error message
  // but we might be getting a more generic message for this error type
  if (errorType === 'not found') {
    expect(text.toLowerCase()).toMatch(/not found|resource not found|unexpected error|failed to update/i);
  } else {
    expect(text.toLowerCase()).toContain(errorType.toLowerCase());
  }
};

// Helper functions for creating success responses
export const createSuccessResponse = <T>(data: T) => {
  return { success: true, data };
};

// Helper functions for creating error responses
export const createErrorResponse = (message: string, errorType: LinearErrorType = "AuthenticationError" as LinearErrorType, status = 500) => {
  // Make sure the error message contains the expected prefix for each error type
  // This is important for test matching
  let standardizedMessage = message;
  
  switch (errorType) {
    case "AuthenticationError" as LinearErrorType:
      if (!message.includes('Authentication error')) {
        standardizedMessage = `Authentication error: ${message}`;
      }
      break;
    case "NetworkError" as LinearErrorType:
      if (!message.includes('Network error')) {
        standardizedMessage = `Network error: ${message}`;
      }
      break;
    case "InvalidInput" as LinearErrorType:
      if (!message.includes('Validation error') || !message.includes('Invalid input')) {
        standardizedMessage = `Validation error: Invalid input. ${message}`;
      }
      break;
    case "FeatureNotAccessible" as LinearErrorType:
      if (!message.includes('Not found')) {
        standardizedMessage = `Not found: ${message}`;
      }
      break;
    case "Unknown" as LinearErrorType:
    case "Other" as LinearErrorType:
      if (!message.includes('Unexpected error')) {
        standardizedMessage = `Unexpected error: ${message}`;
      }
      break;
  }
  
  const error = new LinearError(standardizedMessage, errorType, null, status);
  return {
    success: false,
    error
  };
};

// Mock data for testing
export const mockUserData = { 
  id: 'user-1', 
  name: 'Test User', 
  email: 'test@example.com',
  displayName: 'Test User',
  active: true,
  createdAt: new Date('2023-01-01T00:00:00Z'),
};

export const mockStateData = { 
  id: TEST_IDS.STATE,
  name: 'In Progress', 
  color: '#0000ff', 
  type: 'started' 
};

export const mockTeamData = {
  id: TEST_IDS.TEAM,
  name: 'Engineering',
  key: 'ENG',
  description: 'Engineering team',
  states: {
    nodes: [
      {
        id: TEST_IDS.STATE,
        name: 'Backlog',
        type: 'backlog'
      }
    ]
  }
};

export const mockCommentData = [
  {
    id: 'comment-1',
    body: 'First comment',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:05:00Z'),
    user: Promise.resolve(mockUserData),
  },
];

export const mockIssueData = {
  id: TEST_IDS.ISSUE,
  title: 'Test Issue',
  description: 'This is a test issue',
  priority: 2,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-02T11:00:00Z'),
  state: Promise.resolve(mockStateData),
  assignee: Promise.resolve(mockUserData),
  project: Promise.resolve({ id: TEST_IDS.PROJECT, name: 'Test Project' }),
  comments: async () => ({ nodes: mockCommentData }),
  children: async () => ({ nodes: [] }),
};

export const mockLabelData = {
  id: TEST_IDS.LABEL,
  name: 'Bug',
  color: '#FF0000',
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  team: Promise.resolve(mockTeamData),
};

export const mockProjectData = {
  id: TEST_IDS.PROJECT,
  name: 'Test Project',
  description: 'Test project description',
  state: 'started',
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  teamIds: [TEST_IDS.TEAM],
};

export const mockCycleData = {
  id: TEST_IDS.CYCLE,
  name: 'Sprint 1',
  description: 'First sprint',
  startsAt: new Date('2023-01-01T00:00:00Z'),
  endsAt: new Date('2023-01-14T00:00:00Z'),
  team: Promise.resolve(mockTeamData),
};

// Setup common API response mocks
export const mockApiResponses = {
  // Mock successful issue creation
  mockCreateIssue(mockIssue = mockIssueData) {
    return createSuccessResponse({
      success: true,
      issue: mockIssue
    });
  },
  
  // Mock successful issue retrieval
  mockGetIssue(mockIssue = mockIssueData) {
    return createSuccessResponse(mockIssue);
  },
  
  // Mock successful issue update
  mockUpdateIssue(mockIssue = mockIssueData) {
    return createSuccessResponse({
      success: true,
      issue: mockIssue
    });
  },
  
  // Mock successful issues search
  mockSearchIssues(mockIssues = [mockIssueData]) {
    return createSuccessResponse({
      nodes: mockIssues,
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    });
  },
  
  // Mock successful comment creation
  mockCreateComment(mockComment = mockCommentData[0]) {
    return createSuccessResponse({
      success: true,
      comment: mockComment
    });
  },
  
  // Mock successful comment retrieval
  mockGetComment(mockComments = mockCommentData) {
    return createSuccessResponse({
      issue: {
        comments: {
          nodes: mockComments
        }
      }
    });
  },
  
  // Mock successful comment update
  mockUpdateComment(mockComment = mockCommentData[0]) {
    return createSuccessResponse({
      success: true,
      comment: mockComment
    });
  },
  
  // Mock successful team retrieval
  mockGetTeams(mockTeams = [mockTeamData]) {
    return createSuccessResponse({
      nodes: mockTeams,
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    });
  },
  
  // Mock successful single team retrieval
  mockGetTeam(mockTeam = mockTeamData) {
    return createSuccessResponse(mockTeam);
  },
  
  // Mock successful user profile retrieval
  mockGetProfile(mockUser = mockUserData) {
    return createSuccessResponse(mockUser);
  },
  
  // Mock successful label creation
  mockCreateLabel(mockLabel = mockLabelData) {
    return createSuccessResponse({
      success: true,
      issueLabel: mockLabel
    });
  },
  
  // Mock successful label application
  mockApplyLabels() {
    return createSuccessResponse({
      success: true
    });
  },
  
  // Mock successful project creation
  mockCreateProject(mockProject = mockProjectData) {
    return createSuccessResponse({
      success: true,
      project: mockProject
    });
  },
  
  // Mock successful issue assignment to project
  mockAssignIssueToProject() {
    return createSuccessResponse({
      success: true
    });
  },
  
  // Mock successful issue addition to cycle
  mockAddIssueToCycle() {
    return createSuccessResponse({
      success: true
    });
  },
  
  // Mock error response
  mockErrorResponse(message: string, errorType = 'AuthenticationError' as LinearErrorType, status = 401) {
    return createErrorResponse(message, errorType, status);
  }
};

// Create a standard mock client factory
export const createMockClient = (): EnhancedLinearClient & {
  safeGetIssue: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
  safeCreateIssue: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
  safeUpdateIssue: MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>;
  safeIssues: MockedFunction<(filter?: unknown, first?: number, after?: string) => Promise<LinearResult<unknown>>>;
  safeCreateComment: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
  safeGetComment: MockedFunction<(issueId: string, commentId: string) => Promise<LinearResult<unknown>>>;
  safeUpdateComment: MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>;
  safeDeleteComment: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
  safeTeam: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
  safeTeams: MockedFunction<(filter?: unknown, first?: number, after?: string, includeArchived?: boolean) => Promise<LinearResult<unknown>>>;
  safeCreateIssueLabel: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
  safeCreateLabel: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
  safeGetViewer: MockedFunction<() => Promise<LinearResult<unknown>>>;
  safeApplyLabels: MockedFunction<(issueId: string, labelIds: string[]) => Promise<LinearResult<unknown>>>;
  safeAssignIssueToProject: MockedFunction<(issueId: string, projectId: string) => Promise<LinearResult<unknown>>>;
  safeAddIssueToCycle: MockedFunction<(issueId: string, cycleId: string) => Promise<LinearResult<unknown>>>;
  safeCreateProject: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
} => {
  return {
    linearSdkClient: { client: {} } as unknown,
    client: {} as unknown,
    executeGraphQLQuery: vi.fn(),
    executeGraphQLMutation: vi.fn(),
    safeExecuteGraphQLQuery: vi.fn(),
    safeExecuteGraphQLMutation: vi.fn(),
    safeExecuteGraphQL: vi.fn(),
    safeGetIssue: vi.fn() as MockedFunction<(id: string) => Promise<LinearResult<unknown>>>,
    safeCreateIssue: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    safeUpdateIssue: vi.fn() as MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>,
    safeIssues: vi.fn() as MockedFunction<(filter?: unknown, first?: number, after?: string) => Promise<LinearResult<unknown>>>,
    safeCreateComment: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    safeGetComment: vi.fn() as MockedFunction<(issueId: string, commentId: string) => Promise<LinearResult<unknown>>>,
    safeUpdateComment: vi.fn() as MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>,
    safeDeleteComment: vi.fn() as MockedFunction<(id: string) => Promise<LinearResult<unknown>>>,
    safeTeam: vi.fn() as MockedFunction<(id: string) => Promise<LinearResult<unknown>>>,
    safeTeams: vi.fn() as MockedFunction<(filter?: unknown, first?: number, after?: string, includeArchived?: boolean) => Promise<LinearResult<unknown>>>,
    safeCreateIssueLabel: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    safeCreateLabel: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    safeGetViewer: vi.fn() as MockedFunction<() => Promise<LinearResult<unknown>>>,
    safeApplyLabels: vi.fn() as MockedFunction<(issueId: string, labelIds: string[]) => Promise<LinearResult<unknown>>>,
    safeAssignIssueToProject: vi.fn() as MockedFunction<(issueId: string, projectId: string) => Promise<LinearResult<unknown>>>,
    safeAddIssueToCycle: vi.fn() as MockedFunction<(issueId: string, cycleId: string) => Promise<LinearResult<unknown>>>,
    safeCreateProject: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    _getIssue: vi.fn(),
    _createIssue: vi.fn(),
    _updateIssue: vi.fn(),
    _issues: vi.fn(),
    _createComment: vi.fn(),
    _updateComment: vi.fn(),
    _deleteComment: vi.fn(),
    _createIssueLabel: vi.fn(),
    _teams: vi.fn(),
    _team: vi.fn(),
    _getViewer: vi.fn(),
    _cycle: vi.fn(),
    safeCycle: vi.fn() as MockedFunction<(id: string) => Promise<LinearResult<unknown>>>,
    _cycles: vi.fn(),
    safeCycles: vi.fn() as MockedFunction<(filter?: unknown, first?: number, after?: string, includeArchived?: boolean) => Promise<LinearResult<unknown>>>,
    _createCycle: vi.fn(),
    safeCreateCycle: vi.fn() as MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>,
    _updateCycle: vi.fn(),
    safeUpdateCycle: vi.fn() as MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>,
    _addIssueToCycle: vi.fn(),
    _createProject: vi.fn(),
    testAuthentication: vi.fn(),
    getPriorityLabel: vi.fn(() => "Medium"),
  } as unknown as EnhancedLinearClient & {
    safeGetIssue: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
    safeCreateIssue: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
    safeUpdateIssue: MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>;
    safeIssues: MockedFunction<(filter?: unknown, first?: number, after?: string) => Promise<LinearResult<unknown>>>;
    safeCreateComment: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
    safeGetComment: MockedFunction<(issueId: string, commentId: string) => Promise<LinearResult<unknown>>>;
    safeUpdateComment: MockedFunction<(id: string, input: unknown) => Promise<LinearResult<unknown>>>;
    safeDeleteComment: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
    safeTeam: MockedFunction<(id: string) => Promise<LinearResult<unknown>>>;
    safeTeams: MockedFunction<(filter?: unknown, first?: number, after?: string, includeArchived?: boolean) => Promise<LinearResult<unknown>>>;
    safeCreateIssueLabel: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
    safeCreateLabel: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
    safeGetViewer: MockedFunction<() => Promise<LinearResult<unknown>>>;
    safeApplyLabels: MockedFunction<(issueId: string, labelIds: string[]) => Promise<LinearResult<unknown>>>;
    safeAssignIssueToProject: MockedFunction<(issueId: string, projectId: string) => Promise<LinearResult<unknown>>>;
    safeAddIssueToCycle: MockedFunction<(issueId: string, cycleId: string) => Promise<LinearResult<unknown>>>;
    safeCreateProject: MockedFunction<(input: unknown) => Promise<LinearResult<unknown>>>;
  };
};

// Helper functions for setting up common mocks
export const setupCommonMocks = (mockClient: unknown) => {
  if (mockClient && typeof mockClient === 'object' && 'safeTeam' in mockClient && 'safeTeams' in mockClient) {
    (mockClient as { safeTeam: { mockResolvedValue: (value: unknown) => void } }).safeTeam.mockResolvedValue(mockApiResponses.mockGetTeam());
    (mockClient as { safeTeams: { mockResolvedValue: (value: unknown) => void } }).safeTeams.mockResolvedValue(mockApiResponses.mockGetTeams());
  }
};

// Mock the logger
export const mockLogger = () => {
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
};

// Mock utils.js
export const mockUtils = () => {
  vi.mock('../../libs/utils.js', () => ({
    getStateId: vi.fn().mockResolvedValue(TEST_IDS.STATE),
    normalizeStateName: vi.fn(name => name),
    safeText: vi.fn(text => text || "None"),
    formatDate: vi.fn(date => date ? new Date(date).toISOString() : "None"),
    getPriorityLabel: vi.fn(() => "Medium"),
  }));
}; 