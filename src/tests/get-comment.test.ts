import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearGetCommentTool } from '../tools/linear/get-comment.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses,
    mockUserData,
    TEST_IDS
} from './utils/test-utils.js';

// Create local version of comments for this test
const testComments = [
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

describe('LinearGetCommentTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should return formatted comments on success', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(
      createSuccessResponse({
        comments: async () => ({ nodes: testComments }),
      })
    );
    
    const tool = createLinearGetCommentTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Retrieved 2 comments');
    expect(response.content[0].text).toContain('First comment');
    expect(response.content[0].text).toContain('Second comment');
  });

  it('should handle no comments', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(
      createSuccessResponse({
        comments: async () => ({ nodes: [] }),
      })
    );
    
    const tool = createLinearGetCommentTool(mockClient);
    const response = await tool.handler({ issueId: TEST_IDS.ISSUE }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('No comments found');
  });

  it('should handle error from safeGetIssue', async () => {
    mockClient.safeGetIssue.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Issue not found', LinearErrorType.FeatureNotAccessible)
    );
    
    const tool = createLinearGetCommentTool(mockClient);
    const response = await tool.handler({ issueId: 'BAD-ISSUE' }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'not found');
    expect(response.content[0].text).toContain('Issue not found');
  });
}); 