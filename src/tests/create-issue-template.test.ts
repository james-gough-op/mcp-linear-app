import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLinearClient } from '../tests/mocks/MockLinearClient.js';
import { MockLinearResponses } from '../tests/mocks/linearResponses.js';

// Mock UUIDs for testing - ensure they are valid UUID v4 format
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_TEMPLATE_ID = 'b5f8c1d2-e3f4-45a6-b7c8-9d0e1f2a3b4c';
const MOCK_STATE_ID = 'abcdef12-3456-7890-abcd-ef1234567890';
const INVALID_TEMPLATE_ID = 'not-a-valid-template-id';

// Store LinearCreateIssueTool object and mockClient for testing
let LinearCreateIssueTool: any;
let mockClient: MockLinearClient;

// Mock the utils.js file to avoid API calls for getting state ID
vi.doMock('../libs/utils.js', async () => {
  const actual = await vi.importActual('../libs/utils.js');
  return {
    ...actual,
    // Mock the getStateId function to return a mock state ID
    getStateId: vi.fn().mockResolvedValue(MOCK_STATE_ID),
    // Keep other utilities as they are
    formatDate: actual.formatDate,
    getPriorityLabel: actual.getPriorityLabel,
    normalizeStateName: actual.normalizeStateName,
    safeText: actual.safeText,
  };
});

// Mock the LinearIdSchema and LinearClient before importing modules that use them
vi.doMock('../libs/id-management.js', async () => {
  const zodModule = await vi.importActual<typeof import('zod')>('zod');
  const mockLinearIdSchema = zodModule.z.string().refine((val) => {
    // Accept valid UUIDs and mock UUIDs, reject invalid ones
    return val !== INVALID_TEMPLATE_ID;
  }, {
    message: 'Invalid Linear ID format',
  });
  return { LinearIdSchema: mockLinearIdSchema };
});

vi.doMock('../libs/client.js', async () => {
  mockClient = new MockLinearClient();
  return {
    __esModule: true,
    default: mockClient,
  };
});

// Import the module after mocking its dependencies
describe('LinearCreateIssueTool with Template Support', () => {
  beforeEach(async () => {
    // Import the module fresh for each test
    vi.resetModules();
    const module = await import('../tools/linear/create-issue.js');
    LinearCreateIssueTool = module.LinearCreateIssueTool;

    // Reset the mock client for each test
    mockClient.reset();
  });

  it('should create an issue with a template', async () => {
    // Mock successful response with template info
    mockClient.mockResponseFor('createIssue', MockLinearResponses.createIssueWithTemplateSuccess);

    // Call the handler
    const result = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: 'Test Issue with Template',
      description: 'This is a test issue using a template',
      templateId: MOCK_TEMPLATE_ID,
    });

    // Verify the result contains template information
    expect(result.content[0].text).toContain('Linear issue created');
    expect(result.content[0].text).toContain(MOCK_TEMPLATE_ID);

    // Verify the client was called with expected args
    expect(mockClient.verifyCall('createIssue', {
      title: 'Test Issue with Template',
      description: 'This is a test issue using a template',
      teamId: MOCK_TEAM_ID,
      templateId: MOCK_TEMPLATE_ID,
    })).toBe(true);
  });

  it('should reject invalid template ID', async () => {
    // Call with invalid template ID
    const result = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: 'Test Issue with Invalid Template',
      description: 'This test should fail validation',
      templateId: INVALID_TEMPLATE_ID,
    });

    // Should return error about invalid template ID
    expect(result.content[0].text).toContain('error');
    expect(result.content[0].text).toContain('Invalid Linear ID format');

    // Verify no API call was made
    expect(mockClient.getCallCount('createIssue')).toBe(0);
  });

  it('should create an issue with project, cycle and template all together', async () => {
    // Define mock IDs for testing
    const MOCK_PROJECT_ID = '7f8e9d0c-1b2a-41d4-a716-446655440000';
    const MOCK_CYCLE_ID = '9a8b7c6d-5e4f-43d2-a1b2-c3d4e5f67890';
    
    // Create a custom response that includes project, cycle and template
    const customResponse = {
      success: true,
      issue: {
        id: 'issue_mock_combined',
        title: 'Combined Issue',
        description: 'With project, cycle and template',
        state: {
          id: 'state_mock_123',
          name: 'Todo'
        },
        priority: 2,
        team: {
          id: MOCK_TEAM_ID,
          name: 'Mock Team',
          key: 'MOCK'
        },
        project: {
          id: MOCK_PROJECT_ID,
          name: 'Mock Project'
        },
        cycle: {
          id: MOCK_CYCLE_ID,
          name: 'Mock Cycle',
          number: 4
        },
        lastAppliedTemplate: {
          id: MOCK_TEMPLATE_ID,
          name: 'Mock Template'
        }
      }
    };
    
    mockClient.mockResponseFor('createIssue', customResponse);

    // Call the handler with all optional parameters
    const result = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: 'Combined Issue',
      description: 'With project, cycle and template',
      status: 'todo',
      priority: 'medium',
      projectId: MOCK_PROJECT_ID,
      cycleId: MOCK_CYCLE_ID,
      templateId: MOCK_TEMPLATE_ID,
    });

    // Verify the result contains all referenced IDs
    expect(result.content[0].text).toContain('Linear issue created');
    expect(result.content[0].text).toContain(MOCK_PROJECT_ID);
    expect(result.content[0].text).toContain(MOCK_CYCLE_ID);
    expect(result.content[0].text).toContain(MOCK_TEMPLATE_ID);

    // Verify the client was called with expected args including all IDs
    expect(mockClient.verifyCall('createIssue', {
      teamId: MOCK_TEAM_ID,
      projectId: MOCK_PROJECT_ID,
      cycleId: MOCK_CYCLE_ID,
      templateId: MOCK_TEMPLATE_ID,
    })).toBe(true);
  });

  it('should format template information in the response', async () => {
    // Create a custom response that includes template information
    const customResponse = {
      success: true,
      issue: {
        id: MOCK_ISSUE_ID,
        title: 'Template Issue',
        description: 'Using a special template',
        state: {
          id: MOCK_STATE_ID,
          name: 'Todo'
        },
        priority: 2,
        team: {
          id: MOCK_TEAM_ID,
          name: 'Engineering',
          key: 'ENG'
        },
        lastAppliedTemplate: {
          id: MOCK_TEMPLATE_ID,
          name: 'Bug Report Template'
        }
      }
    };
    
    mockClient.mockResponseFor('createIssue', customResponse);

    // Call the handler
    const result = await LinearCreateIssueTool.handler({
      teamId: MOCK_TEAM_ID,
      title: 'Template Issue',
      description: 'Using a special template',
      templateId: MOCK_TEMPLATE_ID,
    });

    // Verify the result includes formatted template information
    expect(result.content[0].text).toContain('Linear issue created');
    expect(result.content[0].text).toContain('Template applied: ' + MOCK_TEMPLATE_ID);
    
    // If the formatIssueToHumanReadable function includes template info in extended output
    if (result.content[0].text.includes('TEMPLATE INFO')) {
      expect(result.content[0].text).toContain('TEMPLATE INFO');
      expect(result.content[0].text).toContain('Bug Report Template');
    }
  });
}); 