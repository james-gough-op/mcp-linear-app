import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createErrorResult, createSuccessResult, LinearError } from '../libs/errors.js';
import * as utils from '../libs/utils.js';


// Mock UUIDs for testing - ensure they are valid UUID v4 format
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
// Use a valid UUID v4 format for project ID to pass validation
const MOCK_PROJECT_ID = '7f8e9d0c-1b2a-41d4-a716-446655440000';
const MOCK_CYCLE_ID = '9a8b7c6d-5e4f-43d2-a1b2-c3d4e5f67890';
const MOCK_TEMPLATE_ID = 'b5f8c1d2-e3f4-45a6-b7c8-9d0e1f2a3b4c';
const MOCK_STATE_ID = 'abcdef12-3456-7890-abcd-ef1234567890';
const INVALID_PROJECT_ID = 'not-a-valid-uuid';
const INVALID_CYCLE_ID = 'not-a-valid-cycle-id';
const INVALID_TEMPLATE_ID = 'not-a-valid-template-id';

// Mock the LinearIdSchema and other imports before importing modules that use them
vi.doMock('../libs/id-management.js', async () => {
  const zodModule = await import('zod');
  
  // Create the mock of our validation schema that passes our test IDs but still validates others
  const mockLinearIdSchema = {
    parse: vi.fn((value) => {
      if ([MOCK_PROJECT_ID, MOCK_CYCLE_ID, MOCK_TEMPLATE_ID].includes(value)) {
        return value;
      }
      
      if ([INVALID_PROJECT_ID, INVALID_CYCLE_ID, INVALID_TEMPLATE_ID].includes(value)) {
        throw new Error('Invalid Linear ID format. Linear IDs must be valid UUID v4 strings.');
      }
      
      // For other values, validate with regex
      const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof value === 'string' && UUID_V4_REGEX.test(value)) {
        return value;
      }
      
      throw new Error('Invalid Linear ID format. Linear IDs must be valid UUID v4 strings.');
    }),
    optional: () => ({ describe: () => mockLinearIdSchema })
  };
  
  // Create a custom z.string() that we can override
  const mockZString = {
    regex: () => mockLinearIdSchema
  };
  
  return {
    z: {
      ...zodModule.z,
      string: () => mockZString
    },
    LINEAR_ID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    LinearIdSchema: mockLinearIdSchema,
    LinearEntityType: {
      TEAM: 'team',
      PROJECT: 'project',
      ISSUE: 'issue',
      CYCLE: 'cycle',
      LABEL: 'label',
      TEMPLATE: 'template',
    }
  };
});

// Now import modules that use the mocked LinearIdSchema
import { createLinearCreateIssueTool, LinearCreateIssueTool } from '../tools/linear/create-issue.js';

// Mock the dependencies
vi.mock('../libs/client.js', () => {
  // Create a mock implementation of the _createIssue method
  const _createIssue = vi.fn().mockImplementation(async (input) => {
    // Validate input
    if (!input.teamId) {
      throw new LinearError('Team ID is required', LinearErrorType.InvalidInput);
    }
    if (!input.title) {
      throw new LinearError('Title is required', LinearErrorType.InvalidInput);
    }
    
    // Return a mock success response by default
    return {
      success: true,
      issue: {
        id: MOCK_ISSUE_ID,
        title: input.title,
        description: input.description || ''
      }
    };
  });
  
  // Create a mock implementation of the safeCreateIssue method
  const safeCreateIssue = vi.fn().mockImplementation(async (input) => {
    try {
      const result = await _createIssue(input);
      return createSuccessResult(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult(error);
      }
      
      const linearError = new LinearError(
        `Error in safeCreateIssue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.Unknown,
        error
      );
      
      return createErrorResult(linearError);
    }
  });
  
  // Create a mock for safeExecuteGraphQLMutation
  const safeExecuteGraphQLMutation = vi.fn().mockImplementation(async (mutation, variables) => {
    // Extract the input from variables
    const input = variables?.input;
    
    // Check for validation errors
    if (input && !input.teamId) {
      throw new LinearError('Team ID is required', LinearErrorType.InvalidInput);
    }
    if (input && !input.title) {
      throw new LinearError('Title is required', LinearErrorType.InvalidInput);
    }
    
    // Mock issueCreate response if this is for issue creation
    if (mutation.includes('mutation CreateIssue')) {
      return {
        success: true,
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: MOCK_ISSUE_ID,
              title: input.title,
              description: input.description || ''
            }
          }
        }
      };
    }
    
    // Default response
    return {
      success: true,
      data: {}
    };
  });
  
  // Full mock client object
  const mockClient = {
    _createIssue,
    safeCreateIssue,
    executeGraphQLMutation: vi.fn(),
    safeExecuteGraphQLMutation
  };
  
  return {
    default: mockClient,
    enhancedClient: mockClient,
    getEnhancedClient: () => mockClient,
    // Export methods to allow direct manipulation in tests
    __createIssueMock: _createIssue,
    __safeCreateIssueMock: safeCreateIssue,
    __safeExecuteGraphQLMutationMock: safeExecuteGraphQLMutation
  };
});

// Import mocked versions of the exports for testing

vi.mock('../libs/utils.js', async () => {
  const actual = await vi.importActual('../libs/utils.js');
  return {
    ...actual,
    getStateId: vi.fn().mockResolvedValue('mock-state-id')
  };
});

// Define a shared mockClient for all tests
const mockClient = {
  __safeCreateIssueMock: vi.fn(),
  safeCreateIssue: vi.fn(),
};

describe('LinearCreateIssueTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getStateId
    vi.spyOn(utils, 'getStateId').mockResolvedValue(MOCK_STATE_ID);
  });
  
  it('should successfully create an issue without project or cycle', async () => {
    // Mock successful issue creation with a partial issue object
    vi.mocked(mockClient.__safeCreateIssueMock).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue",
          description: "This is a test issue"
        },
        lastSyncId: 123
      } as unknown as any,
      error: undefined
    });
    
    // Call the handler directly
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium"
      // No projectId or cycleId
    }, { signal: new AbortController().signal });
    
    // Verify the response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).not.toContain('Assigned to Project ID');
    expect(response.content[0].text).not.toContain('Assigned to Cycle ID');
  });
  
  it('should validate required parameters', async () => {
    // Test empty team ID
    const responseNoTeam = await LinearCreateIssueTool.handler({
      teamId: "",
      title: "Test Issue",
      description: "This is a test issue"
    }, { signal: new AbortController().signal });
    
    expect(responseNoTeam.content[0].text).toContain('Error: Team ID cannot be empty');
    
    // Test empty title
    const responseNoTitle = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "",
      description: "This is a test issue"
    }, { signal: new AbortController().signal });
    
    expect(responseNoTitle.content[0].text).toContain('Error: Issue title cannot be empty');
  });
  
  it('should successfully create an issue with project assignment', async () => {
    // Mock successful issue creation with project
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue",
          description: "This is a test issue",
          project: {
            id: MOCK_PROJECT_ID,
            name: "Test Project"
          }
        },
        lastSyncId: 123
      },
      error: undefined
    });
    
    // Use DI pattern so the mock is actually used
    const tool = createLinearCreateIssueTool(mockClient as any);
    const response = await tool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify response includes project assignment information
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${MOCK_PROJECT_ID}`);
  });
  
  it('should successfully create an issue with cycle assignment', async () => {
    // Mock successful issue creation with cycle
    vi.mocked(mockClient.__safeCreateIssueMock).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue",
          description: "This is a test issue",
          cycle: {
            id: MOCK_CYCLE_ID,
            name: "Sprint 42",
            number: 42
          }
        },
        lastSyncId: 123
      } as unknown as any,
      error: undefined
    });
    
    // Call the handler directly with cycleId
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });
    
    // Verify response includes cycle assignment information
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${MOCK_CYCLE_ID}`);
  });
  
  it('should successfully create an issue with both project and cycle assignment', async () => {
    // Mock successful issue creation with both project and cycle
    vi.mocked(mockClient.__safeCreateIssueMock).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue",
          description: "This is a test issue",
          project: {
            id: MOCK_PROJECT_ID,
            name: "Test Project"
          },
          cycle: {
            id: MOCK_CYCLE_ID,
            name: "Sprint 42",
            number: 42
          }
        },
        lastSyncId: 123
      } as unknown as any,
      error: undefined
    });
    
    // Call the handler directly with both projectId and cycleId
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      status: "in_progress",
      priority: "medium",
      projectId: MOCK_PROJECT_ID,
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });
    
    // Verify response includes both project and cycle assignment information
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${MOCK_PROJECT_ID}`);
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${MOCK_CYCLE_ID}`);
  });
  
  it('should handle API errors during issue creation', async () => {
    // Mock API error with a result object (not rejection)
    mockClient.safeCreateIssue.mockResolvedValueOnce({
      success: false,
      data: undefined,
      error: new LinearError('API Error: Project not found', LinearErrorType.NetworkError)
    });
    
    // Use DI pattern so the mock is actually used
    const tool = createLinearCreateIssueTool(mockClient as any);
    const response = await tool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify error was properly passed through
    expect(response.content[0].text).toContain('Error:');
    expect(response.content[0].text).toContain('API Error: Project not found');
  });

  it('should reject invalid projectId format', async () => {
    // Test with an invalid projectId format
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      projectId: INVALID_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify validation error response
    expect(response.content[0].text).toContain('Error: Validation error: projectId: Invalid Linear ID format');
  });

  it('should reject invalid cycleId format', async () => {
    // Test with an invalid cycleId format
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      cycleId: INVALID_CYCLE_ID
    }, { signal: new AbortController().signal });
    
    // Verify validation error response
    expect(response.content[0].text).toContain('Error: Validation error: cycleId: Invalid Linear ID format');
  });

  it('should successfully create an issue with template', async () => {
    // Mock successful issue creation with template
    vi.mocked(mockClient.__safeCreateIssueMock).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue from Template",
          description: "This is a test issue created from a template",
          lastAppliedTemplate: {
            id: MOCK_TEMPLATE_ID,
            name: "Test Template"
          }
        },
        lastSyncId: 123
      } as unknown as any,
      error: undefined
    });
    
    // Call the handler directly with templateId
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue from Template",
      description: "This is a test issue created from a template",
      templateId: MOCK_TEMPLATE_ID
    }, { signal: new AbortController().signal });
    
    // Verify the response includes template information
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Template applied: ${MOCK_TEMPLATE_ID}`);
  });
  
  it('should successfully create an issue with template, project, and cycle', async () => {
    // Mock successful issue creation with template, project and cycle
    vi.mocked(mockClient.__safeCreateIssueMock).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        issue: {
          id: MOCK_ISSUE_ID,
          title: "Test Issue with Everything",
          description: "This is a test issue with template, project, and cycle",
          project: {
            id: MOCK_PROJECT_ID,
            name: "Test Project"
          },
          cycle: {
            id: MOCK_CYCLE_ID,
            name: "Sprint 42",
            number: 42
          },
          lastAppliedTemplate: {
            id: MOCK_TEMPLATE_ID,
            name: "Test Template"
          }
        },
        lastSyncId: 123
      } as unknown as any,
      error: undefined
    });
    
    // Call the handler with all optional parameters
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue with Everything",
      description: "This is a test issue with template, project, and cycle",
      status: "in_progress",
      priority: "high",
      projectId: MOCK_PROJECT_ID,
      cycleId: MOCK_CYCLE_ID,
      templateId: MOCK_TEMPLATE_ID
    }, { signal: new AbortController().signal });
    
    // Verify response includes all assignment information
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Success: issue created');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${MOCK_PROJECT_ID}`);
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${MOCK_CYCLE_ID}`);
    expect(response.content[0].text).toContain(`Template applied: ${MOCK_TEMPLATE_ID}`);
  });
  
  it('should reject invalid templateId format', async () => {
    // Test with an invalid templateId format
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      templateId: INVALID_TEMPLATE_ID
    }, { signal: new AbortController().signal });
    
    // Verify validation error response
    expect(response.content[0].text).toContain('Error: Validation error: templateId: Invalid Linear ID format');
  });
});

describe('LinearCreateIssueTool (DI pattern)', () => {
  it('should use a custom mock client via DI', async () => {
    const mockClient = {
      safeCreateIssue: vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: true,
          issue: { id: 'custom-mock-id', title: 'DI Test', description: 'desc' }
        }
      })
    };
    const tool = createLinearCreateIssueTool(mockClient as any);
    const response = await tool.handler({
      teamId: 'team-di',
      title: 'DI Test',
      description: 'desc',
      status: 'in_progress',
      priority: 'medium'
    }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: issue created');
    expect(mockClient.safeCreateIssue).toHaveBeenCalled();
  });
}); 