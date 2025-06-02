import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearUpdateIssueTool } from '../tools/linear/update-issue.js';
import {
  createMockClient,
  expectErrorResponse,
  expectSuccessResponse,
  mockApiResponses,
  mockIssueData,
  mockUtils,
  TEST_IDS
} from './utils/test-utils.js';

// Mock utils.js to avoid issues with getStateId
mockUtils();

describe('LinearUpdateIssueTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    
    // Mock team data for testing
    mockClient.safeGetIssue.mockImplementation(() => ({
      success: true,
      data: { 
        team: Promise.resolve({ id: TEST_IDS.TEAM, name: 'Team Name' }) 
      }
    }));
    
    // Mock successful update
    mockClient.safeUpdateIssue.mockImplementation(() => ({
      success: true,
      data: { 
        issue: Promise.resolve({
          id: TEST_IDS.ISSUE,
          title: 'Updated Title'
        })
      }
    }));
  });

  it('should successfully update an issue', async () => {
    mockClient.safeUpdateIssue.mockResolvedValueOnce(mockApiResponses.mockUpdateIssue({
      ...mockIssueData,
      title: 'Updated Title'
    }));

    const tool = createLinearUpdateIssueTool(mockClient);
    const response = await tool.handler({
      id: TEST_IDS.ISSUE,
      title: 'Updated Title',
      priority: 'high'
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('updated fields');
    expect(mockClient.safeUpdateIssue).toHaveBeenCalled();
  });

  it('should handle error from safeUpdateIssue', async () => {
    mockClient.safeUpdateIssue.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Update failed', LinearErrorType.Unknown)
    );
    
    const tool = createLinearUpdateIssueTool(mockClient);
    const response = await tool.handler({
      id: TEST_IDS.ISSUE,
      title: 'Updated Title',
      priority: 'high'
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Update failed');
  });

  it('should handle error from safeGetIssue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Issue not found', LinearErrorType.FeatureNotAccessible, 404)
    );
    
    const tool = createLinearUpdateIssueTool(mockClient);
    const response = await tool.handler({
      id: TEST_IDS.ISSUE,
      status: 'in_progress'
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'not found');
    expect(response.content[0].text).toContain('Issue not found');
  });
}); 