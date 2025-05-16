/**
 * Mock data for testing Linear tools
 * 
 * This file contains mock data fixtures for use in tests
 */

// Mock IDs for testing - using valid UUID v4 format
export const MOCK_IDS = {
  TEAM: '123e4567-e89b-42d3-a456-556642440000',
  ISSUE: '550e8400-e29b-4ad4-a716-446655440000',
  COMMENT: '7f8e9d0c-1b2a-4d34-a716-446655440000',
  PROJECT: '9a8b7c6d-5e4f-4fd2-a1b2-c3d4e5f67890',
  CYCLE: 'b5f8c1d2-e3f4-4fa6-97c8-9d0e1f2a3b4c',
  WORKFLOW_STATE: 'abcdef12-3456-4890-abcd-ef1234567890',
  LABEL: '11112222-3333-4444-a555-666677778888',
  USER: 'aaaabbbb-cccc-4ddd-aeee-ffff99998888'
};

// Helper to create a mock issue
export function createMockIssue(overrides = {}) {
  return {
    id: MOCK_IDS.ISSUE,
    title: 'Mock Issue',
    description: 'This is a mock issue for testing',
    number: 123,
    priority: 3,
    priorityLabel: 'Medium',
    estimate: 2,
    boardOrder: 1,
    sortOrder: 1,
    stateOrder: 1,
    startedAt: '2023-01-01T00:00:00.000Z',
    completedAt: null,
    canceledAt: null,
    subtasksCount: 0,
    commentsCount: 0,
    state: {
      id: MOCK_IDS.WORKFLOW_STATE,
      name: 'Backlog',
      color: '#6937a1'
    },
    team: {
      id: MOCK_IDS.TEAM,
      name: 'Engineering'
    },
    labels: {
      nodes: []
    },
    comments: {
      nodes: []
    },
    children: {
      nodes: []
    },
    ...overrides
  };
}

// Helper to create a mock comment
export function createMockComment(overrides = {}) {
  return {
    id: MOCK_IDS.COMMENT,
    body: 'This is a mock comment for testing',
    issueId: MOCK_IDS.ISSUE,
    userId: MOCK_IDS.USER,
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
    issue: {
      id: MOCK_IDS.ISSUE,
      title: 'Mock Issue'
    },
    user: {
      id: MOCK_IDS.USER,
      name: 'Test User'
    },
    ...overrides
  };
}

// Helper to create a mock team
export function createMockTeam(overrides = {}) {
  return {
    id: MOCK_IDS.TEAM,
    name: 'Engineering',
    key: 'ENG',
    description: 'Engineering team',
    ...overrides
  };
}

// Helper to create a mock user
export function createMockUser(overrides = {}) {
  return {
    id: MOCK_IDS.USER,
    name: 'Test User',
    email: 'test@example.com',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.png',
    ...overrides
  };
}

// Helper to create a mock label
export function createMockLabel(overrides = {}) {
  return {
    id: MOCK_IDS.LABEL,
    name: 'Bug',
    color: '#FF0000',
    teamId: MOCK_IDS.TEAM,
    ...overrides
  };
}

// Helper to create a mock project
export function createMockProject(overrides = {}) {
  return {
    id: MOCK_IDS.PROJECT,
    name: 'Test Project',
    description: 'This is a test project',
    state: 'planned',
    ...overrides
  };
}

// Helper to create a mock cycle
export function createMockCycle(overrides = {}) {
  return {
    id: MOCK_IDS.CYCLE,
    name: 'Sprint 1',
    description: 'First sprint',
    number: 1,
    startsAt: '2023-01-01T00:00:00.000Z',
    endsAt: '2023-01-14T00:00:00.000Z',
    ...overrides
  };
} 