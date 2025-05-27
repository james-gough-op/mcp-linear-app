import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearGetTeamIdTool } from '../tools/linear/get-team-id.js';

const mockTeams = [
  { id: 'team-1', name: 'Engineering' },
  { id: 'team-2', name: 'Design' },
];

describe('LinearGetTeamIdTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeTeams: vi.fn(),
    };
  });

  it('should return formatted team list on success', async () => {
    mockClient.safeTeams.mockResolvedValueOnce({ success: true, data: { nodes: mockTeams } });
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: Team IDs retrieved');
    expect(response.content[0].text).toContain('Engineering');
    expect(response.content[0].text).toContain('Design');
  });

  it('should handle no teams found', async () => {
    mockClient.safeTeams.mockResolvedValueOnce({ success: true, data: { nodes: [] } });
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('No teams found');
  });

  it('should handle error from client', async () => {
    mockClient.safeTeams.mockResolvedValueOnce({ success: false, error: { message: 'API error' } });
    const tool = createLinearGetTeamIdTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('API error');
  });
}); 