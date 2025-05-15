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
  ISSUE: 'iss_ca8f7971-3831-4e80-b7ae-ebafcbe3bd4f',
  COMMENT: 'com_2b30b2c6-8d72-4b4a-b5c5-5c7ae7944bd9',
  TEAM: 'tea_8d872b4a-b5c5-5c7a-e794-4bd97ea8f79c',
  PROJECT: 'pro_7ea8f79c-8d87-2b4a-b5c5-5c7ae7944bd9',
  CYCLE: 'cyc_5c7ae794-4bd9-7ea8-f79c-8d872b4ab5c5',
  USER: 'usr_b5c55c7a-e794-4bd9-7ea8-f79c8d872b4a',
  LABEL: 'lab_4bd97ea8-f79c-8d87-2b4a-b5c55c7ae794',
  STATE: 'wst_f79c8d87-2b4a-b5c5-5c7a-e7944bd97ea8'
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
  id: MOCK_IDS.STATE,
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
  assignee: createMockUser({ id: MOCK_IDS.USER + '1', name: 'Assignee User' }),
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