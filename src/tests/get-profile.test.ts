import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createLinearGetProfileTool } from '../tools/linear/get-profile.js';

// Mock data for testing
const mockProfile = {
  id: 'user-1',
  name: 'Test User',
  displayName: 'Test Display Name',
  email: 'test@example.com',
  active: true,
  admin: false,
  guest: false,
  createdAt: new Date('2023-01-01T10:00:00Z'),
  lastSeen: new Date('2024-01-15T15:30:00Z'),
  timezone: 'UTC',
  createdIssueCount: 42,
  url: 'https://linear.app/test/user',
};

interface MockLinearClient {
  safeGetViewer: Mock;
}

// Use any type to avoid TypeScript errors related to the enhanced client interface
describe('LinearGetProfileTool (DI pattern)', () => {
  let mockClient: MockLinearClient;

  beforeEach(() => {
    mockClient = {
      safeGetViewer: vi.fn(),
    };
  });

  it('should return formatted profile details on success', async () => {
    mockClient.safeGetViewer.mockResolvedValueOnce({
      success: true,
      data: mockProfile,
    });
    
    const tool = createLinearGetProfileTool(mockClient as any);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Success: Profile data retrieved');
    expect(response.content[0].text).toContain('User ID: user-1');
    expect(response.content[0].text).toContain('Name: Test User');
    expect(response.content[0].text).toContain('Display name: Test Display Name');
    expect(response.content[0].text).toContain('Email: test@example.com');
    expect(response.content[0].text).toContain('Status: Active');
    expect(response.content[0].text).toContain('Admin: No');
    expect(response.content[0].text).toContain('Guest: No');
    expect(response.content[0].text).toContain('Issues created: 42');
    expect(response.content[0].text).toContain('URL: https://linear.app/test/user');
  });

  it('should handle profile with minimal information', async () => {
    const minimalProfile = {
      id: 'user-2',
      name: 'Minimal User',
      active: false,
      admin: false,
      guest: true,
    };
    
    mockClient.safeGetViewer.mockResolvedValueOnce({
      success: true,
      data: minimalProfile,
    });
    
    const tool = createLinearGetProfileTool(mockClient as any);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Success: Profile data retrieved');
    expect(response.content[0].text).toContain('User ID: user-2');
    expect(response.content[0].text).toContain('Name: Minimal User');
    expect(response.content[0].text).toContain('Status: Inactive');
    expect(response.content[0].text).toContain('Admin: No');
    expect(response.content[0].text).toContain('Guest: Yes');
    // Should not contain optional fields
    expect(response.content[0].text).not.toContain('Display name');
    expect(response.content[0].text).not.toContain('Email');
    expect(response.content[0].text).not.toContain('Issues created');
  });

  it('should handle error when profile retrieval fails', async () => {
    mockClient.safeGetViewer.mockResolvedValueOnce({
      success: false,
      error: { message: 'Authentication failed', type: 'AuthenticationError' },
    });
    
    const tool = createLinearGetProfileTool(mockClient as any);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Error: Authentication error');
    expect(response.isError).toBe(true);
  });

  it('should handle unexpected errors during profile retrieval', async () => {
    mockClient.safeGetViewer.mockRejectedValueOnce(new Error('Network error'));
    
    const tool = createLinearGetProfileTool(mockClient as any);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Error: Unexpected error');
    expect(response.content[0].text).toContain('Network error');
    expect(response.isError).toBe(true);
  });
}); 