/**
 * Standard mock data for Linear entities
 * 
 * This module provides factories and constants for creating mock Linear API responses
 * to be used in tests. These mock objects follow the structure expected from GraphQL responses.
 */

/**
 * Mock IDs - using UUID v4 format following Linear's pattern
 */
export const MOCK_IDS = {
  ORGANIZATION: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  WORKSPACE: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  USER:      'b2c3d4e5-f6a7-4b8c-ac9d-1f2a3b4c5d6e',
  ASSIGNEE:  'c3d4e5f6-a7b8-4c9d-bf0e-2a3b4c5d6e7f',
  TEAM:      'd4e5f6a7-b8c9-4d0e-8f2a-3b4c5d6e7f80',
  PROJECT:   'e5f6a7b8-c9d0-4e1f-9f2a-4c5d6e7f8091',
  ISSUE:     'f6a7b8c9-d0e1-4f2a-af2a-5d6e7f8091a2',
  COMMENT:   'a7b8c9d0-e1f2-4a3b-bf2a-6e7f8091a2b3',
  CYCLE:     'b8c9d0e1-f2a3-4b4c-8f2a-7f8091a2b3c4',
  LABEL:     'c9d0e1f2-a3b4-4c5d-9f2a-8091a2b3c4d5',
  VIEWER:    'd0e1f2a3-b4c5-4d6e-af2a-91a2b3c4d5e6',
  WORKFLOW_STATE: 'e1f2a3b4-c5d6-4e7f-bf2a-a2b3c4d5e6f7'
};

/**
 * Mock date strings for consistent testing
 */
export const MOCK_DATES = {
  CREATED: '2023-01-15T10:30:00.000Z',
  UPDATED: '2023-01-16T14:45:00.000Z',
  COMPLETED: '2023-01-20T09:15:00.000Z',
  DUE: '2023-01-25T23:59:59.000Z'
};

/**
 * Basic User mock
 */
export const createMockUser = (overrides = {}) => ({
  id: MOCK_IDS.USER,
  name: 'Test User',
  email: 'test@example.com',
  displayName: 'Test User',
  active: true,
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic Team mock
 */
export const createMockTeam = (overrides = {}) => ({
  id: MOCK_IDS.TEAM,
  name: 'Engineering',
  key: 'ENG',
  description: 'Engineering team',
  color: '#0000FF',
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic WorkflowState mock
 */
export const createMockWorkflowState = (overrides = {}) => ({
  id: MOCK_IDS.WORKFLOW_STATE,
  name: 'In Progress',
  color: '#FFA500',
  type: 'started',
  position: 3,
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic Label mock
 */
export const createMockLabel = (overrides = {}) => ({
  id: MOCK_IDS.LABEL,
  name: 'Bug',
  color: '#FF0000',
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic Cycle mock
 */
export const createMockCycle = (overrides = {}) => ({
  id: MOCK_IDS.CYCLE,
  name: 'Sprint 42',
  number: 42,
  startsAt: MOCK_DATES.CREATED,
  endsAt: MOCK_DATES.DUE,
  completedAt: null,
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic Project mock
 */
export const createMockProject = (overrides = {}) => ({
  id: MOCK_IDS.PROJECT,
  name: 'Website Redesign',
  description: 'Redesigning the company website',
  icon: '🖥️',
  color: '#00FF00',
  state: 'started',
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  ...overrides
});

/**
 * Basic Issue mock
 */
export const createMockIssue = (overrides = {}) => ({
  id: MOCK_IDS.ISSUE,
  title: 'Fix login button',
  description: 'The login button is not working correctly',
  number: 123,
  priority: 2,
  priorityLabel: 'High',
  estimate: 3,
  boardOrder: 0,
  sortOrder: 0,
  stateOrder: 1,
  startedAt: MOCK_DATES.CREATED,
  completedAt: null,
  canceledAt: null,
  teamId: MOCK_IDS.TEAM,
  cycleId: MOCK_IDS.CYCLE,
  projectId: MOCK_IDS.PROJECT,
  creatorId: MOCK_IDS.USER,
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  dueDate: MOCK_DATES.DUE,
  url: `https://linear.app/company/issue/${MOCK_IDS.ISSUE}`,
  // Nested objects
  team: createMockTeam(),
  creator: createMockUser(),
  assignee: createMockUser({ id: MOCK_IDS.ASSIGNEE, name: 'Assignee User' }),
  state: createMockWorkflowState(),
  labels: {
    nodes: [createMockLabel()]
  },
  children: {
    nodes: []
  },
  ...overrides
});

/**
 * Basic Comment mock
 */
export const createMockComment = (overrides = {}) => ({
  id: MOCK_IDS.COMMENT,
  body: 'This is a test comment',
  issueId: MOCK_IDS.ISSUE,
  userId: MOCK_IDS.USER,
  createdAt: MOCK_DATES.CREATED,
  updatedAt: MOCK_DATES.UPDATED,
  // Nested objects
  issue: { id: MOCK_IDS.ISSUE, title: 'Fix login button' },
  user: { id: MOCK_IDS.USER, name: 'Test User' },
  ...overrides
});

/**
 * Mock GraphQL response for issue query
 */
export const createMockIssueResponse = (overrides = {}) => ({
  data: {
    issue: createMockIssue(overrides)
  }
});

/**
 * Mock GraphQL response for comment query
 */
export const createMockCommentResponse = (overrides = {}) => ({
  data: {
    comment: createMockComment(overrides)
  }
});

/**
 * Mock GraphQL response for team query
 */
export const createMockTeamResponse = (overrides = {}) => ({
  data: {
    team: createMockTeam(overrides)
  }
});

/**
 * Mock GraphQL response for issue creation
 */
export const createMockIssueCreateResponse = (overrides = {}) => ({
  data: {
    issueCreate: {
      success: true,
      issue: createMockIssue(overrides)
    }
  }
});

/**
 * Mock GraphQL response for comment creation
 */
export const createMockCommentCreateResponse = (overrides = {}) => ({
  data: {
    commentCreate: {
      success: true,
      comment: createMockComment(overrides)
    }
  }
});

/**
 * Mock GraphQL response for error
 */
export const createMockErrorResponse = (message = 'An error occurred', code = 'NOT_FOUND') => ({
  errors: [
    {
      message,
      extensions: {
        code
      }
    }
  ]
});

/**
 * Creates connection response with nodes for paginated data
 */
export const createMockConnectionResponse = <T>(entityType: string, nodes: T[]) => ({
  data: {
    [entityType]: {
      nodes,
      pageInfo: {
        hasNextPage: false,
        endCursor: 'cursor-value'
      }
    }
  }
});

/**
 * Mock GraphQL response for issues query (connection)
 */
export const createMockIssuesResponse = (issues = [createMockIssue()]) => 
  createMockConnectionResponse('issues', issues);

/**
 * Mock GraphQL response for teams query (connection)
 */
export const createMockTeamsResponse = (teams = [createMockTeam()]) => 
  createMockConnectionResponse('teams', teams); 