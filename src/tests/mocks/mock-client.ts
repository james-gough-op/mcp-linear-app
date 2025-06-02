import { LinearErrorType } from '@linear/sdk';
import { vi } from 'vitest';
import { LinearError } from '../../libs/errors.js';

/**
 * Mock client for testing Linear tools
 * 
 * This module provides a type-safe way to mock the enhancedClient
 * functions for testing without type errors.
 */

// Create a mock client with all methods mocked
export const mockEnhancedClient = {
  safeCreateIssue: vi.fn(),
  safeUpdateIssue: vi.fn(),
  safeGetIssue: vi.fn(),
  safeIssues: vi.fn(),
  safeCreateComment: vi.fn(),
  safeGetComment: vi.fn(),
  safeUpdateComment: vi.fn(),
  safeGetTeams: vi.fn(),
  safeTeams: vi.fn(), // Correct name if safeGetTeams doesn't exist
  safeTeam: vi.fn(), // Adding the missing safeTeam function
  safeGetProfile: vi.fn(),
  safeViewerUser: vi.fn(), // Correct name if safeGetProfile doesn't exist
  safeCreateIssueLabel: vi.fn(), // Correct name if safeCreateLabel doesn't exist
  safeCreateLabel: vi.fn(),
  safeApplyLabels: vi.fn(),
  safeIssueLabelsAdd: vi.fn(), // Correct name if safeApplyLabels doesn't exist
  safeAddIssueToCycle: vi.fn(),
  safeAssignIssueToProject: vi.fn(),
  safeCreateProject: vi.fn(),
  safeExecuteGraphQLQuery: vi.fn(),
  safeExecuteGraphQLMutation: vi.fn()
};

// Add an index signature to the type
type EnhancedClientWithIndexSignature = typeof mockEnhancedClient & {
  [key: string]: unknown;
};

// Setup client mock for testing
export function setupClientMock() {
  // Implement the mock module for client.js
  vi.mock('../../libs/client.js', () => {
    return {
      default: mockEnhancedClient,
      getEnhancedClient: () => mockEnhancedClient
    };
  });
}

// Reset all mocks
export function resetClientMocks() {
  vi.clearAllMocks();
  // Cast to the type with index signature to avoid type errors
  const clientWithIndex = mockEnhancedClient as EnhancedClientWithIndexSignature;
  
  for (const key in mockEnhancedClient) {
    if (typeof clientWithIndex[key] === 'function' && 'mockClear' in clientWithIndex[key]) {
      (clientWithIndex[key] as { mockClear: () => void }).mockClear();
    }
  }
}

// Helper to create a successful mock response
export function createSuccessMockResponse<T>(data: T) {
  return {
    success: true,
    data
  };
}

// Helper to create an error mock response
export function createErrorMockResponse(message: string, errorType: LinearErrorType, status?: number) {
  const error = new LinearError(message, errorType, null, status);
  return {
    success: false,
    error
  };
} 