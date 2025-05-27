import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createLinearGetIssueTool } from '../tools/linear/get-issue.js';

// Mock data for testing
const mockUser = { id: 'user-1', name: 'Test User' };
const mockState = { name: 'In Progress', color: '#0000ff', type: 'started' };
const mockComments = [
  {
    id: 'comment-1',
    body: 'First comment',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:05:00Z'),
    user: Promise.resolve(mockUser),
  },
  {
    id: 'comment-2',
    body: 'Second comment',
    createdAt: new Date('2024-01-02T11:00:00Z'),
    updatedAt: new Date('2024-01-02T11:05:00Z'),
    user: Promise.resolve(mockUser),
  },
];

const mockSubIssues = [
  {
    id: 'sub-1',
    title: 'Sub-issue 1',
    priority: 2,
    state: Promise.resolve({ name: 'Todo', color: '#999999' }),
  },
  {
    id: 'sub-2',
    title: 'Sub-issue 2',
    priority: 1,
    state: Promise.resolve({ name: 'In Progress', color: '#0000ff' }),
  },
];

interface MockLinearClient {
  safeGetIssue: Mock;
}

// Use any type to avoid TypeScript errors related to the enhanced client interface
describe('LinearGetIssueTool (DI pattern)', () => {
  let mockClient: MockLinearClient;

  beforeEach(() => {
    mockClient = {
      safeGetIssue: vi.fn(),
    };
  });

  it('should return formatted issue details on success', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'issue-1',
        title: 'Test Issue',
        description: 'This is a test issue',
        priority: 2,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockState),
        assignee: Promise.resolve(mockUser),
        project: Promise.resolve({ id: 'project-1', name: 'Test Project' }),
        comments: async () => ({ nodes: mockComments }),
        children: async () => ({ nodes: mockSubIssues }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient as any);
    const response = await tool.handler({ issueId: 'issue-1' }, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain('ID: issue-1');
    expect(response.content[0].text).toContain('Title: Test Issue');
    expect(response.content[0].text).toContain('Status: In Progress');
    expect(response.content[0].text).toContain('Assignee: Test User');
    expect(response.content[0].text).toContain('Project: Test Project');
    expect(response.content[0].text).toContain('--- Sub-issues (2) ---');
    expect(response.content[0].text).toContain('--- Comments (2) ---');
  });

  it('should handle issue with no sub-issues or comments', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'issue-2',
        title: 'Empty Issue',
        description: '',
        priority: 0,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockState),
        comments: async () => ({ nodes: [] }),
        children: async () => ({ nodes: [] }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient as any);
    const response = await tool.handler({ issueId: 'issue-2' }, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain('ID: issue-2');
    expect(response.content[0].text).toContain('Description: No description');
    expect(response.content[0].text).toContain('Priority: No Priority');
    expect(response.content[0].text).toContain('--- Sub-issues (0) ---');
    expect(response.content[0].text).toContain('No sub-issues.');
    expect(response.content[0].text).toContain('--- Comments (0) ---');
    expect(response.content[0].text).toContain('No comments or failed to load comments.');
  });

  it('should handle error when issue not found', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: false,
      error: { message: 'Issue not found', type: 'UserError' },
    });
    
    const tool = createLinearGetIssueTool(mockClient as any);
    const response = await tool.handler({ issueId: 'non-existent' }, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Error: Not found');
    expect(response.isError).toBe(true);
  });

  it('should handle validation error for missing issueId', async () => {
    const tool = createLinearGetIssueTool(mockClient as any);
    // @ts-ignore - Deliberately passing invalid args to test validation
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expect(response.content[0].text).toContain('Error: Validation error');
    expect(response.isError).toBe(true);
  });

  it('should handle errors when fetching comments', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'issue-3',
        title: 'Issue with Error',
        description: 'This issue has errors when fetching comments',
        priority: 3,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockState),
        // This will cause an error when trying to fetch comments
        comments: async () => { throw new Error('Failed to fetch comments'); },
        children: async () => ({ nodes: [] }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient as any);
    const response = await tool.handler({ issueId: 'issue-3' }, { signal: new AbortController().signal });
    
    // Tool should handle the error gracefully and still return issue details
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain('ID: issue-3');
    expect(response.content[0].text).toContain('--- Comments (0) ---');
    expect(response.content[0].text).toContain('No comments or failed to load comments.');
  });
}); 