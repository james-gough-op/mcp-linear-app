import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearCreateProjectTool } from '../tools/linear/create-project.js';

// Mock UUIDs for testing
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('LinearCreateProjectTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeCreateProject: vi.fn()
    };
  });

  it('should successfully create a project', async () => {
    const mockProjectPayload = {
      success: true,
      project: {
        id: MOCK_PROJECT_ID,
        name: "Test Project",
        description: "Test project description",
        state: "backlog",
        color: "#FF5500"
      }
    };
    mockClient.safeCreateProject.mockResolvedValueOnce({ success: true, data: mockProjectPayload });
    const tool = createLinearCreateProjectTool(mockClient);
    const response = await tool.handler({
      name: "Test Project",
      description: "Test project description",
      teamIds: [MOCK_TEAM_ID],
      color: "#FF5500",
      state: "backlog"
    }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success');
    expect(mockClient.safeCreateProject).toHaveBeenCalled();
  });

  it('should handle error from safeCreateProject', async () => {
    mockClient.safeCreateProject.mockResolvedValueOnce({ success: false, error: { message: 'Project creation failed' } });
    const tool = createLinearCreateProjectTool(mockClient);
    const response = await tool.handler({
      name: "Test Project",
      teamIds: [MOCK_TEAM_ID]
    }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Project creation failed');
    expect(response.content[0].text).toContain('Error');
  });
}); 