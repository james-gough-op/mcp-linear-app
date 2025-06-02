import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearCreateProjectTool } from '../tools/linear/create-project.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses,
    TEST_IDS
} from './utils/test-utils.js';

describe('LinearCreateProjectTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully create a project', async () => {
    const mockProjectPayload = {
      success: true,
      project: {
        id: TEST_IDS.PROJECT,
        name: "Test Project",
        description: "Test project description",
        state: "backlog",
        color: "#FF5500"
      }
    };
    
    mockClient.safeCreateProject.mockResolvedValueOnce(
      createSuccessResponse(mockProjectPayload)
    );
    
    const tool = createLinearCreateProjectTool(mockClient);
    const response = await tool.handler({
      name: "Test Project",
      description: "Test project description",
      teamIds: [TEST_IDS.TEAM],
      color: "#FF5500",
      state: "backlog"
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success');
    expect(mockClient.safeCreateProject).toHaveBeenCalled();
  });

  it('should handle error from safeCreateProject', async () => {
    mockClient.safeCreateProject.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Project creation failed', LinearErrorType.Unknown)
    );
    
    const tool = createLinearCreateProjectTool(mockClient);
    const response = await tool.handler({
      name: "Test Project",
      teamIds: [TEST_IDS.TEAM]
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Project creation failed');
  });
}); 