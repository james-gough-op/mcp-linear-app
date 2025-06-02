// Mock utils.js to avoid API calls for getting state ID
vi.mock('../libs/utils.js', async () => {
  const actual = await vi.importActual('../libs/utils.js');
  return {
    ...actual,
    getStateId: vi.fn().mockResolvedValue('state_mock_123'),
  };
});

import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinearError } from '../libs/errors.js';
import { createLinearCreateIssueTool } from '../tools/linear/create-issue.js';
import {
    createMockClient,
    expectErrorResponse,
    expectSuccessResponse,
    INVALID_IDS,
    TEST_IDS
} from './utils/test-utils.js';

describe('LinearCreateIssueTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let tool: ReturnType<typeof createLinearCreateIssueTool>;

  beforeEach(() => {
    mockClient = createMockClient();
    tool = createLinearCreateIssueTool(mockClient);
    vi.clearAllMocks();
  });
  
  it('should successfully create an issue without project or cycle', async () => {
    // Mock successful issue creation
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue",
          description: "This is a test issue",
          priority: 2,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-02T11:00:00Z'),
          state: Promise.resolve({ id: TEST_IDS.STATE, name: 'In Progress', color: '#0000ff', type: 'started' }),
          assignee: Promise.resolve(null),
          project: Promise.resolve(null),
          comments: async () => ({ nodes: [] }),
          children: async () => ({ nodes: [] })
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium"
      // No projectId or cycleId
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).not.toContain('Assigned to Project ID');
    expect(response.content[0].text).not.toContain('Assigned to Cycle ID');
  });
  
  it('should validate required parameters', async () => {
    // Mock an error response for empty team ID
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: false,
      data: {
        error: {
          message: 'Team ID is required'
        }
      },
      error: new LinearError('Team ID is required', LinearErrorType.InvalidInput)
    });
    
    // Test empty team ID
    const responseNoTeam = await tool.handler({
      teamId: "",
      title: "Test Issue",
      description: "This is a test issue"
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(responseNoTeam, 'error');
    expect(responseNoTeam.content[0].text).toContain('Team ID cannot be empty');
    
    // Mock an error response for empty title
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: false,
      data: {
        error: {
          message: 'Title is required'
        }
      },
      error: new LinearError('Title is required', LinearErrorType.InvalidInput)
    });
    
    // Test empty title
    const responseNoTitle = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "",
      description: "This is a test issue"
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(responseNoTitle, 'error');
    expect(responseNoTitle.content[0].text).toContain('Issue title cannot be empty');
  });
  
  it('should successfully create an issue with project assignment', async () => {
    // Mock successful issue creation with project
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue",
          description: "This is a test issue",
          project: {
            id: TEST_IDS.PROJECT,
            name: "Test Project"
          }
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      projectId: TEST_IDS.PROJECT
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${TEST_IDS.PROJECT}`);
  });
  
  it('should successfully create an issue with cycle assignment', async () => {
    // Mock successful issue creation with cycle
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue",
          description: "This is a test issue",
          cycle: {
            id: TEST_IDS.CYCLE,
            name: "Sprint 42",
            number: 42
          }
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      cycleId: TEST_IDS.CYCLE
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${TEST_IDS.CYCLE}`);
  });
  
  it('should successfully create an issue with both project and cycle assignment', async () => {
    // Mock successful issue creation with both project and cycle
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue",
          description: "This is a test issue",
          project: {
            id: TEST_IDS.PROJECT,
            name: "Test Project"
          },
          cycle: {
            id: TEST_IDS.CYCLE,
            name: "Sprint 42",
            number: 42
          }
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      projectId: TEST_IDS.PROJECT,
      cycleId: TEST_IDS.CYCLE
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${TEST_IDS.PROJECT}`);
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${TEST_IDS.CYCLE}`);
  });
  
  it('should handle API errors during issue creation', async () => {
    // Mock API error with a result object (not rejection)
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: false,
      data: undefined,
      error: new LinearError('API Error: Project not found', LinearErrorType.NetworkError)
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      projectId: TEST_IDS.PROJECT
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Error:');
    expect(response.content[0].text).toContain('API Error: Project not found');
  });

  it('should reject invalid projectId format', async () => {
    // Test with an invalid projectId format
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      projectId: INVALID_IDS.PROJECT
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Error: Validation error: projectId: Invalid Linear ID format');
  });

  it('should reject invalid cycleId format', async () => {
    // Test with an invalid cycleId format
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      cycleId: INVALID_IDS.CYCLE
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Error: Validation error: cycleId: Invalid Linear ID format');
  });

  it('should successfully create an issue with template', async () => {
    // Mock successful issue creation with template
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue from Template",
          description: "This is a test issue created from a template",
          lastAppliedTemplate: {
            id: TEST_IDS.TEMPLATE,
            name: "Test Template"
          }
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue from Template",
      description: "This is a test issue created from a template",
      templateId: TEST_IDS.TEMPLATE
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Template applied: ${TEST_IDS.TEMPLATE}`);
  });
  
  it('should successfully create an issue with template, project, and cycle', async () => {
    // Mock successful issue creation with template, project and cycle
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: TEST_IDS.ISSUE,
          title: "Test Issue with Everything",
          description: "This is a test issue with template, project, and cycle",
          project: {
            id: TEST_IDS.PROJECT,
            name: "Test Project"
          },
          cycle: {
            id: TEST_IDS.CYCLE,
            name: "Sprint 42",
            number: 42
          },
          lastAppliedTemplate: {
            id: TEST_IDS.TEMPLATE,
            name: "Test Template"
          }
        }
      }
    });
    
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue with Everything",
      description: "This is a test issue with template, project, and cycle",
      status: "in_progress",
      priority: "high",
      projectId: TEST_IDS.PROJECT,
      cycleId: TEST_IDS.CYCLE,
      templateId: TEST_IDS.TEMPLATE
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${TEST_IDS.PROJECT}`);
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${TEST_IDS.CYCLE}`);
    expect(response.content[0].text).toContain(`Template applied: ${TEST_IDS.TEMPLATE}`);
  });
  
  it('should reject invalid templateId format', async () => {
    // Test with an invalid templateId format
    const response = await tool.handler({
      teamId: TEST_IDS.TEAM,
      title: "Test Issue",
      description: "This is a test issue",
      templateId: INVALID_IDS.TEMPLATE
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Error: Validation error: templateId: Invalid Linear ID format');
  });
});

describe('LinearCreateIssueTool (DI pattern)', () => {
  it('should use a custom mock client via DI', async () => {
    const mockCustomClient = createMockClient();
    mockCustomClient.safeCreateIssue.mockResolvedValue({
      success: true,
      data: {
        success: true,
        issue: { 
          id: 'custom-mock-id', 
          title: 'DI Test', 
          description: 'desc',
          priority: 1,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
          state: Promise.resolve({ id: TEST_IDS.STATE, name: 'Todo', color: '#999999', type: 'backlog' }),
          assignee: Promise.resolve(null),
          project: Promise.resolve(null),
          comments: async () => ({ nodes: [] }),
          children: async () => ({ nodes: [] })
        }
      }
    });
    
    const tool = createLinearCreateIssueTool(mockCustomClient);
    const response = await tool.handler({
      teamId: 'team-di',
      title: 'DI Test',
      description: 'desc',
      status: 'in_progress',
      priority: 'medium'
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: issue created');
    expect(mockCustomClient.safeCreateIssue).toHaveBeenCalled();
  });
}); 