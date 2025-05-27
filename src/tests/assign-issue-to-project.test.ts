import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearAssignIssueToProjectTool, LinearAssignIssueToProjectTool } from '../tools/linear/assign-issue-to-project.js';

// Mock Linear API responses
vi.mock('../libs/client.js', () => {
  const mockClient = { safeUpdateIssue: vi.fn() };
  return {
    getEnhancedClient: () => mockClient
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
      success: true,
      data: {
        success: true,
        issue: Promise.resolve({
          id: MOCK_ISSUE_ID,
          identifier: "TEST-123",
          title: "Test issue",
          project: Promise.resolve({
            id: MOCK_PROJECT_ID,
            name: "Test Project"
          })
        })
      }
    } as any;
    
    // Get the mockClient from the mocked module
    const { getEnhancedClient } = await import('../libs/client.js');
    const mockClient = getEnhancedClient();
    vi.mocked(mockClient.safeUpdateIssue).mockResolvedValueOnce(mockResponse);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: MOCK_ISSUE_ID,
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify the mutation was called with correct parameters
    expect(mockClient.safeUpdateIssue).toHaveBeenCalledWith(
      MOCK_ISSUE_ID,
      { projectId: MOCK_PROJECT_ID }
    );
    
    // Verify success response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Success: issue to project assigned');
    expect(response.content[0].text).toContain('TEST-123');
  });

  it('should handle failed API responses', async () => {
    // Mock failed response from Linear API
    const mockResponse = {
      success: false,
      data: undefined,
      error: { message: 'Failed to assign' }
    } as any;
    
    // Get the mockClient from the mocked module
    const { getEnhancedClient } = await import('../libs/client.js');
    const mockClient = getEnhancedClient();
    vi.mocked(mockClient.safeUpdateIssue).mockResolvedValueOnce(mockResponse);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: MOCK_ISSUE_ID,
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify failure response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Failed to assign');
    expect(response.content[0].text).toContain('Please try again later');
  });
});

describe('LinearAssignIssueToProjectTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeUpdateIssue: vi.fn()
    };
  });

  it('should successfully assign an issue to a project', async () => {
    const mockIssue = {
      id: MOCK_ISSUE_ID,
      identifier: 'TEST-123',
      title: 'Test issue',
      project: Promise.resolve({ id: MOCK_PROJECT_ID, name: 'Test Project' })
    };
    mockClient.safeUpdateIssue.mockResolvedValueOnce({
      success: true,
      data: { success: true, issue: Promise.resolve(mockIssue) }
    });
    const tool = createLinearAssignIssueToProjectTool(mockClient);
    const response = await tool.handler({ issueId: MOCK_ISSUE_ID, projectId: MOCK_PROJECT_ID }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('assigned');
    expect(response.content[0].text).toContain('Test issue');
    expect(response.content[0].text).toContain('Test Project');
    expect(mockClient.safeUpdateIssue).toHaveBeenCalled();
  });

  it('should handle failed API responses', async () => {
    mockClient.safeUpdateIssue.mockResolvedValueOnce({ success: false, error: { message: 'Failed to assign' } });
    const tool = createLinearAssignIssueToProjectTool(mockClient);
    const response = await tool.handler({ issueId: MOCK_ISSUE_ID, projectId: MOCK_PROJECT_ID }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Failed to assign');
    expect(response.content[0].text).toContain('Please try again later');
  });
}); 