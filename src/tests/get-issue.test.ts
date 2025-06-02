import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearGetIssueTool } from '../tools/linear/get-issue.js';
import {
    createMockClient,
    expectErrorResponse,
    expectSuccessResponse,
    mockStateData,
    mockUserData,
    TEST_IDS
} from './utils/test-utils.js';

// Define mock data specific to this test
const mockComments = [
  {
    id: 'comment-1',
    body: 'First comment',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:05:00Z'),
    user: Promise.resolve(mockUserData),
  },
  {
    id: 'comment-2',
    body: 'Second comment',
    createdAt: new Date('2024-01-02T11:00:00Z'),
    updatedAt: new Date('2024-01-02T11:05:00Z'),
    user: Promise.resolve(mockUserData),
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

describe('LinearGetIssueTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should return formatted issue details on success', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        id: TEST_IDS.ISSUE,
        title: 'Test Issue',
        description: 'This is a test issue',
        priority: 2,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockStateData),
        assignee: Promise.resolve(mockUserData),
        project: Promise.resolve({ id: TEST_IDS.PROJECT, name: 'Test Project' }),
        comments: async () => ({ nodes: mockComments }),
        children: async () => ({ nodes: mockSubIssues }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain(`ID: ${TEST_IDS.ISSUE}`);
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
        id: TEST_IDS.ISSUE,
        title: 'Empty Issue',
        description: '',
        priority: 0,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockStateData),
        comments: async () => ({ nodes: [] }),
        children: async () => ({ nodes: [] }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain(`ID: ${TEST_IDS.ISSUE}`);
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
      error: { message: 'Issue not found', type: 'NotFound' },
    });
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: 'non-existent' }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'not found');
    expect(response.isError).toBe(true);
  });

  it('should handle validation error for missing issueId', async () => {
    const tool = createLinearGetIssueTool(mockClient);
    // @ts-ignore - Deliberately passing invalid args to test validation
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'validation');
    expect(response.isError).toBe(true);
  });

  it('should handle errors when fetching comments', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        id: TEST_IDS.ISSUE,
        title: 'Issue with Error',
        description: 'This issue has errors when fetching comments',
        priority: 3,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T11:00:00Z'),
        state: Promise.resolve(mockStateData),
        // This will cause an error when trying to fetch comments
        comments: async () => { throw new Error('Failed to fetch comments'); },
        children: async () => ({ nodes: [] }),
      },
    });
    
    const tool = createLinearGetIssueTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    // Tool should handle the error gracefully and still return issue details
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Issue Details');
    expect(response.content[0].text).toContain(`ID: ${TEST_IDS.ISSUE}`);
    expect(response.content[0].text).toContain('--- Comments (0) ---');
    expect(response.content[0].text).toContain('No comments or failed to load comments.');
  });
}); 