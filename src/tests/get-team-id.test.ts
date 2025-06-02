import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearGetTeamIdTool } from '../tools/linear/get-team-id.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses
} from './utils/test-utils.js';

// Custom team data for this test
const mockTeams = [
  { id: 'team-1', name: 'Engineering' },
  { id: 'team-2', name: 'Design' },
];

describe('LinearGetTeamIdTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should return formatted team list on success', async () => {
    mockClient.safeTeams.mockResolvedValueOnce(
      createSuccessResponse({ nodes: mockTeams })
    );
    
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Team IDs retrieved');
    expect(response.content[0].text).toContain('Engineering');
    expect(response.content[0].text).toContain('Design');
  });

  it('should handle no teams found', async () => {
    mockClient.safeTeams.mockResolvedValueOnce(
      createSuccessResponse({ nodes: [] })
    );
    
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('No teams found');
  });

  it('should handle error from client', async () => {
    mockClient.safeTeams.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API error', LinearErrorType.Unknown)
    );
    
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('API error');
  });
}); 