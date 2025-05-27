import { LinearDocument } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinearGetProfileTool } from '../tools/linear/get-profile.js';
import { MOCK_IDS } from './mocks/mock-data.js';

// Helper to create a mock user
function createMockUser(): LinearDocument.User {
  return {
    id: MOCK_IDS.USER,
    name: 'Test User',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    admin: true,
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeen: new Date(),
    organization: {
      id: MOCK_IDS.ORGANIZATION,
      name: 'Test Organization',
      urlKey: 'test-org',
      allowedAuthServices: [],
      createdAt: new Date(),
      createdIssueCount: 0,
      customerCount: 0,
    } as unknown as LinearDocument.Organization,
    teams: {
      nodes: [
        {
          id: MOCK_IDS.TEAM,
          name: 'Test Team',
          key: 'TST'
        } as unknown as LinearDocument.Team
      ]
    } as unknown as LinearDocument.TeamConnection
  } as unknown as LinearDocument.User;
}

describe('LinearGetProfileTool (DI pattern)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      safeGetViewer: vi.fn()
    };
  });

  it('should successfully get the user profile', async () => {
    const mockUser = createMockUser();
    mockClient.safeGetViewer.mockResolvedValueOnce({ success: true, data: mockUser });
    const tool = createLinearGetProfileTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: Profile data retrieved');
    expect(mockClient.safeGetViewer).toHaveBeenCalled();
  });

  it('should handle error from safeGetViewer', async () => {
    mockClient.safeGetViewer.mockResolvedValueOnce({ success: false, error: { message: 'Profile fetch failed' } });
    const tool = createLinearGetProfileTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Profile fetch failed');
    expect(response.content[0].text).toContain('Error');
  });
}); 