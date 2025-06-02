import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearAssignIssueToProjectTool, LinearAssignIssueToProjectTool } from '../tools/linear/assign-issue-to-project.js';
import {
    createMockClient,
    expectErrorResponse,
    expectSuccessResponse,
    INVALID_IDS,
    mockApiResponses,
    TEST_IDS
} from './utils/test-utils.js';

// For the non-DI pattern tests, we need to mock the client module
vi.mock('../libs/client.js', () => {
  const mockClient = { safeUpdateIssue: vi.fn() };
  return {
    getEnhancedClient: () => mockClient
  };
});

describe('LinearAssignIssueToProjectTool', () => {
  it('should validate issue ID format', async () => {
    // Call the handler with invalid issue ID
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: INVALID_IDS.ISSUE,
      projectId: TEST_IDS.PROJECT
    }, { signal: new AbortController().signal });

    expectErrorResponse(response, 'invalid');
    expect(response.content[0].text).toContain('Invalid Linear ID format');
  });

  it('should validate project ID format', async () => {
    // Call the handler with invalid project ID
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: TEST_IDS.ISSUE,
      projectId: INVALID_IDS.PROJECT
    }, { signal: new AbortController().signal });

    expectErrorResponse(response, 'invalid');
    expect(response.content[0].text).toContain('Invalid Linear ID format');
  });

  it('should successfully assign an issue to a project', async () => {
    // Create a mock issue with project info
    const mockIssue = {
      id: TEST_IDS.ISSUE,
      identifier: "TEST-123",
      title: "Test issue",
      project: Promise.resolve({
        id: TEST_IDS.PROJECT,
        name: "Test Project"
      })
    };

    // Mock successful response with type casting to avoid type errors
    const mockResponse = {
      success: true,
      data: { success: true, issue: Promise.resolve(mockIssue) }
    } as any;
    
    // Get the mockClient from the mocked module
    const { getEnhancedClient } = await import('../libs/client.js');
    const mockClient = getEnhancedClient();
    vi.mocked(mockClient.safeUpdateIssue).mockResolvedValueOnce(mockResponse);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: TEST_IDS.ISSUE,
      projectId: TEST_IDS.PROJECT
    }, { signal: new AbortController().signal });
    
    // Verify the mutation was called with correct parameters
    expect(mockClient.safeUpdateIssue).toHaveBeenCalledWith(
      TEST_IDS.ISSUE,
      { projectId: TEST_IDS.PROJECT }
    );
    
    // Verify success response
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue to project assigned');
    expect(response.content[0].text).toContain('TEST-123');
  });

  it('should handle failed API responses', async () => {
    // Mock failed response from Linear API
    const mockResponse = mockApiResponses.mockErrorResponse('Failed to assign', LinearErrorType.Unknown);
    
    // Get the mockClient from the mocked module
    const { getEnhancedClient } = await import('../libs/client.js');
    const mockClient = getEnhancedClient();
    vi.mocked(mockClient.safeUpdateIssue).mockResolvedValueOnce(mockResponse);
    
    // Call the handler with valid parameters
    const response = await LinearAssignIssueToProjectTool.handler({
      issueId: TEST_IDS.ISSUE,
      projectId: TEST_IDS.PROJECT
    }, { signal: new AbortController().signal });
    
    // Verify failure response
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Failed to assign');
    expect(response.content[0].text).toContain('Please try again later');
  });
});

describe('LinearAssignIssueToProjectTool (DI pattern)', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully assign an issue to a project', async () => {
    const mockIssue = {
      id: TEST_IDS.ISSUE,
      identifier: 'TEST-123',
      title: 'Test issue',
      project: Promise.resolve({ id: TEST_IDS.PROJECT, name: 'Test Project' })
    };
    
    // Use type casting to avoid type errors with the mock response
    mockClient.safeUpdateIssue.mockResolvedValueOnce({
      success: true,
      data: { success: true, issue: Promise.resolve(mockIssue) }
    } as any);
    
    const tool = createLinearAssignIssueToProjectTool(mockClient);
    const response = await tool.handler(
      { issueId: TEST_IDS.ISSUE, projectId: TEST_IDS.PROJECT }, 
      { signal: new AbortController().signal }
    );
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('assigned');
    expect(response.content[0].text).toContain('Test issue');
    expect(response.content[0].text).toContain('Test Project');
    expect(mockClient.safeUpdateIssue).toHaveBeenCalled();
  });

  it('should handle failed API responses', async () => {
    mockClient.safeUpdateIssue.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Failed to assign', LinearErrorType.Unknown)
    );
    
    const tool = createLinearAssignIssueToProjectTool(mockClient);
    const response = await tool.handler(
      { issueId: TEST_IDS.ISSUE, projectId: TEST_IDS.PROJECT }, 
      { signal: new AbortController().signal }
    );
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Failed to assign');
    expect(response.content[0].text).toContain('Please try again later');
  });
}); 