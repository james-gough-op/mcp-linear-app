import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createLinearGetCommentTool } from '../tools/linear/get-comment.js';

const mockUser = { id: 'user-1', name: 'Alice' };
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

interface MockLinearClient {
  safeGetIssue: Mock;
}

interface EnhancedLinearClientSubset {
  safeGetIssue: Mock;
}

describe('LinearGetCommentTool (DI pattern)', () => {
  let mockClient: MockLinearClient;

  beforeEach(() => {
    mockClient = {
      safeGetIssue: vi.fn(),
    };
  });

  it('should return formatted comments on success', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        comments: async () => ({ nodes: mockComments }),
      },
    });
    const tool = createLinearGetCommentTool(mockClient as EnhancedLinearClientSubset);
    const response = await tool.handler({ issueId: 'ISSUE-1' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: Retrieved 2 comments');
    expect(response.content[0].text).toContain('First comment');
    expect(response.content[0].text).toContain('Second comment');
  });

  it('should handle no comments', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: true,
      data: {
        comments: async () => ({ nodes: [] }),
      },
    });
    const tool = createLinearGetCommentTool(mockClient as EnhancedLinearClientSubset);
    const response = await tool.handler({ issueId: 'ISSUE-2' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('No comments found');
  });

  it('should handle error from safeGetIssue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce({
      success: false,
      error: { message: 'Issue not found' },
    });
    const tool = createLinearGetCommentTool(mockClient as EnhancedLinearClientSubset);
    const response = await tool.handler({ issueId: 'BAD-ISSUE' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Issue not found');
  });
}); 