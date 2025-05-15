import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearCreateProjectTool } from '../tools/linear/create-project.js';

// Mock UUIDs for testing
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

// Mock project response
const mockProjectResponse = {
  data: {
    projectCreate: {
      success: true,
      project: {
        id: MOCK_PROJECT_ID,
        name: "Test Project",
        description: "Test project description",
        state: "backlog",
        color: "#FF5500"
      }
    }
  }
};

describe('LinearCreateProjectTool', () => {
  beforeEach(() => {
    // Mock the GraphQL client
    vi.spyOn(enhancedClient, 'executeGraphQLMutation').mockImplementation(async () => {
      return mockProjectResponse;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully create a project', async () => {
    // Call the handler
    const response = await LinearCreateProjectTool.handler({
      name: "Test Project",
      description: "Test project description",
      teamIds: [MOCK_TEAM_ID],
      color: "#FF5500",
      state: "backlog"
    }, { signal: new AbortController().signal });

    // Verify GraphQL mutation was called with correct parameters
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('projectCreate'),
      expect.objectContaining({
        name: "Test Project",
        description: "Test project description",
        teamIds: [MOCK_TEAM_ID],
        color: "#FF5500",
        state: "backlog"  // state should be lowercase as defined in our enum
      })
    );

    // Check response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('LINEAR PROJECT CREATED');
    expect(response.content[0].text).toContain('Test Project');
  });

  it('should return an error when project name is empty', async () => {
    // Call the handler with empty name
    const response = await LinearCreateProjectTool.handler({
      name: "",
      teamIds: [MOCK_TEAM_ID]
    }, { signal: new AbortController().signal });

    // Verify error message format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Project name is required');
  });

  it('should validate team IDs are provided', async () => {
    // @ts-ignore - Deliberately passing invalid params for testing
    const response = await LinearCreateProjectTool.handler({
      name: "Test Project",
      teamIds: []
    }, { signal: new AbortController().signal });

    // Verify validation error
    expect(response.content[0].text).toContain('At least one team ID is required');
  });
}); 