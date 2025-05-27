import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createLinearCreateCommentTool } from '../tools/linear/create-comment.js';

const mockComment = {
  id: 'comment-123',
  body: 'Test comment',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:05:00Z'),
  user: Promise.resolve({ id: 'user-1', name: 'Alice' }),
};

interface HasSafeCreateComment {
  safeCreateComment: Mock;
}

describe('LinearCreateCommentTool (DI pattern)', () => {
  let mockClient: HasSafeCreateComment;

  beforeEach(() => {
    mockClient = {
      safeCreateComment: vi.fn(),
    };
  });

  it('should return success response with comment ID', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce({
      success: true,
      data: { comment: Promise.resolve(mockComment) },
    });
    const tool = createLinearCreateCommentTool(mockClient as HasSafeCreateComment);
    const response = await tool.handler({ issueId: 'ISSUE-1', comment: 'Test comment' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: comment created');
    expect(response.content[0].text).toContain('ID: comment-123');
  });

  it('should handle error from safeCreateComment', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce({
      success: false,
      error: { message: 'API error' },
    });
    const tool = createLinearCreateCommentTool(mockClient as HasSafeCreateComment);
    const response = await tool.handler({ issueId: 'ISSUE-2', comment: 'Fail' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('API error');
  });

  it('should handle comment created but no ID', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce({
      success: true,
      data: { comment: Promise.resolve({}) },
    });
    const tool = createLinearCreateCommentTool(mockClient as HasSafeCreateComment);
    const response = await tool.handler({ issueId: 'ISSUE-3', comment: 'No ID' }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('on issue: ISSUE-3 (ID not available)');
  });
});
