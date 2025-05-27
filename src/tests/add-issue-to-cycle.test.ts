import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearAddIssueToCycleTool } from '../tools/linear/add-issue-to-cycle.js';

// Mock UUIDs for testing
const MOCK_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_CYCLE_ID = '7f8e9d0c-1b2a-43c4-a716-446655440000';
const INVALID_ID = 'not-a-valid-uuid';

// Setup mocks
vi.mock('../libs/client.js', () => {
  const mockClient = { executeGraphQLMutation: vi.fn() };
  return {
    getEnhancedClient: () => mockClient
  };
});

// Sample successful response
const successResponse = {
  data: {
    issueUpdate: {
      success: true,
      issue: {
        id: MOCK_ISSUE_ID,
        identifier: 'ENG-123',
        title: 'Test Issue',
        cycle: {
          id: MOCK_CYCLE_ID,
          name: 'Sprint 42',
          number: 42
        }
      }
    }
  }
};

// Sample failed response
const failedResponse = {
  data: {
    issueUpdate: {
      success: false
    }
  }
};

describe('LinearAddIssueToCycleTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeAddIssueToCycle: vi.fn()
    };
  });

  it('should successfully add an issue to a cycle', async () => {
    const mockIssue = {
      id: MOCK_ISSUE_ID,
      identifier: 'ENG-123',
      title: 'Test Issue',
      cycle: Promise.resolve({ id: MOCK_CYCLE_ID, name: 'Sprint 42', number: 42 })
    };
    mockClient.safeAddIssueToCycle.mockResolvedValueOnce({
      success: true,
      data: { success: true, issue: Promise.resolve(mockIssue) }
    });
    const tool = createLinearAddIssueToCycleTool(mockClient);
    const response = await tool.handler({ issueId: MOCK_ISSUE_ID, cycleId: MOCK_CYCLE_ID }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: issue to cycle added');
    expect(response.content[0].text).toContain('ENG-123');
    expect(response.content[0].text).toContain('Sprint 42');
    expect(response.content[0].text).toContain('#42');
    expect(mockClient.safeAddIssueToCycle).toHaveBeenCalled();
  });

  it('should handle failed update from Linear API', async () => {
    mockClient.safeAddIssueToCycle.mockResolvedValueOnce({ success: false, error: { message: 'Failed to add' } });
    const tool = createLinearAddIssueToCycleTool(mockClient);
    const response = await tool.handler({ issueId: MOCK_ISSUE_ID, cycleId: MOCK_CYCLE_ID }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Failed to add');
    expect(response.content[0].text).toContain('Error');
  });
}); 