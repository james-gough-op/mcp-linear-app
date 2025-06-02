// Mock utils.js to avoid issues with getStateId
vi.mock('../libs/utils.js', async () => {
  const actual = await vi.importActual('../libs/utils.js');
  return {
    ...actual,
    getStateId: vi.fn().mockResolvedValue('state_mock_123'),
  };
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearCreateIssueTool } from '../tools/linear/create-issue.js';
import {
  createMockClient,
  expectErrorResponse,
  expectSuccessResponse,
  INVALID_IDS,
  mockApiResponses,
  TEST_IDS
} from './utils/test-utils.js';

describe('LinearCreateIssueTool with Template Support', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let tool: ReturnType<typeof createLinearCreateIssueTool>;

  beforeEach(() => {
    mockClient = createMockClient();
    tool = createLinearCreateIssueTool(mockClient);
    vi.clearAllMocks();
  });

  it('should create an issue with a template', async () => {
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          ...mockApiResponses.mockCreateIssue().data.issue,
          id: TEST_IDS.ISSUE,
          title: 'Test Issue with Template',
          description: 'This is a test issue using a template',
          lastAppliedTemplate: {
            id: TEST_IDS.TEMPLATE,
            name: 'Test Template'
          }
        }
      }
    });

    const result = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: 'Test Issue with Template',
      description: 'This is a test issue using a template',
      templateId: TEST_IDS.TEMPLATE,
    },{ signal: new AbortController().signal });

    expectSuccessResponse(result);
    expect(result.content[0].text).toContain('Success: issue created');
    expect(result.content[0].text).toContain(TEST_IDS.TEMPLATE);
    expect(mockClient.safeCreateIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Issue with Template',
        description: 'This is a test issue using a template',
        teamId: TEST_IDS.TEAM,
        templateId: TEST_IDS.TEMPLATE,
      })
    );
  });

  it('should reject invalid template ID', async () => {
    const result = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: 'Test Issue with Invalid Template',
      description: 'This test should fail validation',
      templateId: INVALID_IDS.TEMPLATE,
    },{ signal: new AbortController().signal });

    expectErrorResponse(result, 'invalid');
    expect(result.content[0].text).toContain('Invalid Linear ID format');
    expect(mockClient.safeCreateIssue).not.toHaveBeenCalled();
  });

  it('should create an issue with project, cycle and template all together', async () => {
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: 'issue_mock_combined',
          title: 'Combined Issue',
          description: 'With project, cycle and template',
          state: { id: 'state_mock_123', name: 'Todo' },
          priority: 2,
          team: { id: TEST_IDS.TEAM, name: 'Mock Team', key: 'MOCK' },
          project: { id: TEST_IDS.PROJECT, name: 'Mock Project' },
          cycle: { id: TEST_IDS.CYCLE, name: 'Mock Cycle', number: 4 },
          lastAppliedTemplate: { id: TEST_IDS.TEMPLATE, name: 'Mock Template' }
        }
      }
    });

    const result = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: 'Combined Issue',
      description: 'With project, cycle and template',
      status: 'todo',
      priority: 'medium',
      projectId: TEST_IDS.PROJECT,
      cycleId: TEST_IDS.CYCLE,
      templateId: TEST_IDS.TEMPLATE,
    },{ signal: new AbortController().signal });

    expectSuccessResponse(result);
    expect(result.content[0].text).toContain('Success: issue created');
    expect(result.content[0].text).toContain(TEST_IDS.PROJECT);
    expect(result.content[0].text).toContain(TEST_IDS.CYCLE);
    expect(result.content[0].text).toContain(TEST_IDS.TEMPLATE);
  });

  it('should format template information in the response', async () => {
    // Create a custom response that includes template information
    const customResponse = {
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: 'Template Issue',
          description: 'Using a special template',
          state: {
            id: TEST_IDS.STATE,
            name: 'Todo'
          },
          priority: 2,
          team: {
            id: TEST_IDS.TEAM,
            name: 'Engineering',
            key: 'ENG'
          },
          lastAppliedTemplate: {
            id: TEST_IDS.TEMPLATE,
            name: 'Bug Report Template'
          }
        },
        lastSyncId: 123
      },
      error: undefined
    };
    
    mockClient.safeCreateIssue.mockResolvedValueOnce(customResponse);

    // Call the handler
    const result = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: 'Template Issue',
      description: 'Using a special template',
      templateId: TEST_IDS.TEMPLATE,
    },{ signal: new AbortController().signal });

    // Verify the result includes formatted template information
    expectSuccessResponse(result);
    expect(result.content[0].text).toContain('Success: issue created');
    expect(result.content[0].text).toContain('Template applied: ' + TEST_IDS.TEMPLATE);
    
    if (typeof result.content?.[0]?.text === 'string' && result.content[0].text.includes('TEMPLATE INFO')) {
      expect(result.content[0].text).toContain('TEMPLATE INFO');
      expect(result.content[0].text).toContain('Bug Report Template');
    }
  });
  
  it('should handle error responses from the API', async () => {
    // Mock an error response
    const errorResponse = {
      success: false,
      data: undefined,
      error: {
        message: 'API error: Team not found',
        type: 'NetworkError'
      }
    };
    
    mockClient.safeCreateIssue.mockResolvedValueOnce(errorResponse);
    
    // Call the handler
    const result = await tool.handler({
      teamId: 'invalid-team-id',
      title: 'Test Issue',
      description: 'This should fail'
    },{ signal: new AbortController().signal });
    
    // Verify error is properly shown
    expectErrorResponse(result, 'not found');
    expect(result.content[0].text).toContain('Error:');
    expect(result.content[0].text).toContain('API error: Team not found');
  });
}); 