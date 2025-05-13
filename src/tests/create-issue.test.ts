import { beforeEach, describe, expect, it, vi } from 'vitest';
import linearClient from '../libs/client.js';
import * as utils from '../libs/utils.js';

// Mock UUIDs for testing - ensure they are valid UUID v4 format
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
// Use a valid UUID v4 format for project ID to pass validation
const MOCK_PROJECT_ID = '7f8e9d0c-1b2a-41d4-a716-446655440000';
const MOCK_CYCLE_ID = '9a8b7c6d-5e4f-43d2-a1b2-c3d4e5f67890';
const MOCK_STATE_ID = 'abcdef12-3456-7890-abcd-ef1234567890';
const INVALID_PROJECT_ID = 'not-a-valid-uuid';
const INVALID_CYCLE_ID = 'not-a-valid-cycle-id';

// Mock the LinearIdSchema and other imports before importing modules that use them
vi.doMock('../libs/id-management.js', async () => {
  const zodModule = await import('zod');
  
  // Create the mock of our validation schema that passes our test IDs but still validates others
  const mockLinearIdSchema = {
    parse: vi.fn((value) => {
      if ([MOCK_PROJECT_ID, MOCK_CYCLE_ID].includes(value)) {
        return value;
      }
      
      if ([INVALID_PROJECT_ID, INVALID_CYCLE_ID].includes(value)) {
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
    }
  };
});

// Now import modules that use the mocked LinearIdSchema
import { LinearCreateIssueTool } from '../tools/linear/create-issue.js';

// Mock the dependencies
vi.mock('../libs/client.js', () => ({
  default: {
    createIssue: vi.fn()
  }
}));

vi.mock('../libs/utils.js', async () => {
  const actual = await vi.importActual('../libs/utils.js');
  return {
    ...actual,
    getStateId: vi.fn().mockResolvedValue('mock-state-id')
  };
});

describe('LinearCreateIssueTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getStateId
    vi.spyOn(utils, 'getStateId').mockResolvedValue(MOCK_STATE_ID);
  });
  
  it('should successfully create an issue without project or cycle', async () => {
    // Mock successful issue creation with a partial issue object
    vi.mocked(linearClient.createIssue).mockResolvedValueOnce({
      success: true,
      issue: Promise.resolve({
        id: MOCK_ISSUE_ID,
        title: "Test Issue",
        description: "This is a test issue"
      } as any)
    } as any);
    
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
    expect(response.content[0].text).toContain('Status: Success');
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
    vi.mocked(linearClient.createIssue).mockResolvedValueOnce({
      success: true,
      issue: Promise.resolve({
        id: MOCK_ISSUE_ID,
        title: "Test Issue",
        description: "This is a test issue",
        project: {
          id: MOCK_PROJECT_ID,
          name: "Test Project"
        }
      } as any)
    } as any);
    
    // Call the handler directly with projectId
    const response = await LinearCreateIssueTool.handler({
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
    expect(response.content[0].text).toContain('Status: Success');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${MOCK_PROJECT_ID}`);
  });
  
  it('should successfully create an issue with cycle assignment', async () => {
    // Mock successful issue creation with cycle
    vi.mocked(linearClient.createIssue).mockResolvedValueOnce({
      success: true,
      issue: Promise.resolve({
        id: MOCK_ISSUE_ID,
        title: "Test Issue",
        description: "This is a test issue",
        cycle: {
          id: MOCK_CYCLE_ID,
          name: "Sprint 42",
          number: 42
        }
      } as any)
    } as any);
    
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
    expect(response.content[0].text).toContain('Status: Success');
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${MOCK_CYCLE_ID}`);
  });
  
  it('should successfully create an issue with both project and cycle assignment', async () => {
    // Mock successful issue creation with both project and cycle
    vi.mocked(linearClient.createIssue).mockResolvedValueOnce({
      success: true,
      issue: Promise.resolve({
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
      } as any)
    } as any);
    
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
    expect(response.content[0].text).toContain('Status: Success');
    expect(response.content[0].text).toContain(`Assigned to Project ID: ${MOCK_PROJECT_ID}`);
    expect(response.content[0].text).toContain(`Assigned to Cycle ID: ${MOCK_CYCLE_ID}`);
  });
  
  it('should handle API errors during issue creation', async () => {
    // Mock API error
    vi.mocked(linearClient.createIssue).mockRejectedValueOnce(
      new Error('API Error: Project not found')
    );
    
    // Call the handler directly with projectId
    const response = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: "Test Issue",
      description: "This is a test issue",
      projectId: MOCK_PROJECT_ID
    }, { signal: new AbortController().signal });
    
    // Verify error was properly passed through
    expect(response.content[0].text).toContain('An error occurred while creating the issue');
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
    expect(response.content[0].text).toContain('Validation error: projectId: Invalid Linear ID format');
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
    expect(response.content[0].text).toContain('Validation error: cycleId: Invalid Linear ID format');
  });
}); 