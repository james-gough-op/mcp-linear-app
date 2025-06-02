import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearAddIssueToCycleTool } from '../tools/linear/add-issue-to-cycle.js';
import {
  createMockClient,
  createSuccessResponse,
  expectErrorResponse,
  expectSuccessResponse,
  mockApiResponses,
  TEST_IDS
} from './utils/test-utils.js';

describe('LinearAddIssueToCycleTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully add an issue to a cycle', async () => {
    const mockIssue = {
      id: TEST_IDS.ISSUE,
      identifier: 'ENG-123',
      title: 'Test Issue',
      cycle: Promise.resolve({ id: TEST_IDS.CYCLE, name: 'Sprint 42', number: 42 })
    };
    
    mockClient.safeAddIssueToCycle.mockResolvedValueOnce(
      createSuccessResponse({ 
        success: true, 
        issue: Promise.resolve(mockIssue) 
      })
    );
    
    const tool = createLinearAddIssueToCycleTool(mockClient);
    const response = await tool.handler({ 
      issueId: TEST_IDS.ISSUE, 
      cycleId: TEST_IDS.CYCLE 
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue to cycle added');
    expect(response.content[0].text).toContain('ENG-123');
    expect(response.content[0].text).toContain('Sprint 42');
    expect(response.content[0].text).toContain('#42');
    expect(mockClient.safeAddIssueToCycle).toHaveBeenCalled();
  });

  it('should handle failed update from Linear API', async () => {
    mockClient.safeAddIssueToCycle.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Failed to add', LinearErrorType.FeatureNotAccessible)
    );
    
    const tool = createLinearAddIssueToCycleTool(mockClient);
    const response = await tool.handler({ 
      issueId: TEST_IDS.ISSUE, 
      cycleId: TEST_IDS.CYCLE 
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'failed');
    expect(response.content[0].text).toContain('Failed to add');
  });
}); 