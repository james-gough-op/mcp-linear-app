import { describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearResult } from '../libs/errors.js';
import { LinearAssignIssueToProjectTool } from '../tools/linear/assign-issue-to-project.js';

// Mock Linear API responses
vi.mock('../libs/client.js', () => {
  return {
    default: {},
    enhancedClient: {
      executeGraphQLMutation: vi.fn()
    }
  };
});

// Mock UUIDs for testing
const MOCK_ISSUE_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('LinearAssignIssueToProjectTool', () => {
  it('should validate issue ID format', async () => {
    // Call the handler with invalid issue ID
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: "invalid-id",
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });

    // Verify error message
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Invalid Linear ID format');
  });

  it('should validate project ID format', async () => {
    // Call the handler with invalid project ID
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: MOCK_ISSUE_ID,
      projectId: "invalid-id"
    }, { signal: new AbortController().signal });

    // Verify error message
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Invalid Linear ID format');
  });

  it('should successfully assign an issue to a project', async () => {
    // Mock successful response from Linear API
    const mockResponse = {
      data: {
        issueUpdate: {
          success: true,
          issue: {
            id: MOCK_ISSUE_ID,
            identifier: "TEST-123",
            title: "Test issue",
            project: {
              id: MOCK_PROJECT_ID,
              name: "Test Project"
            }
          }
        }
      }
    };
    
    // Set up the mock to return our test data
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: MOCK_ISSUE_ID,
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify the mutation was called with correct parameters
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('mutation AssignIssueToProject'),
      {
        issueId: MOCK_ISSUE_ID,
        projectId: MOCK_PROJECT_ID
      }
    );
    
    // Verify success response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('ISSUE ASSIGNED TO PROJECT');
    expect(response.content[0].text).toContain('TEST-123');
  });

  it('should handle failed API responses', async () => {
    // Mock failed response from Linear API
    const mockResponse = {
      data: {
        issueUpdate: {
          success: false
        }
      }
    };
    
    // Set up the mock to return our failed response
    vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: MOCK_ISSUE_ID,
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify failure response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Failed to assign issue to project');
  });
}); 