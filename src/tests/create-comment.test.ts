import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearCreateCommentTool } from '../tools/linear/create-comment.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses,
    mockCommentData,
    TEST_IDS
} from './utils/test-utils.js';

describe('LinearCreateCommentTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should return success response with comment ID', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce(
      createSuccessResponse({ 
        comment: Promise.resolve(mockCommentData[0]) 
      })
    );
    
    const tool = createLinearCreateCommentTool(mockClient);
    const response = await tool.handler({ 
      issueId: TEST_IDS.ISSUE, 
      comment: 'Test comment' 
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: comment created');
    expect(response.content[0].text).toContain('ID: comment-1');
  });

  it('should handle error from safeCreateComment', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API error', LinearErrorType.Unknown)
    );
    
    const tool = createLinearCreateCommentTool(mockClient);
    const response = await tool.handler({ 
      issueId: TEST_IDS.ISSUE, 
      comment: 'Fail' 
    }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('API error');
  });

  it('should handle comment created but no ID', async () => {
    mockClient.safeCreateComment.mockResolvedValueOnce(
      createSuccessResponse({ 
        comment: Promise.resolve({}) 
      })
    );
    
    const tool = createLinearCreateCommentTool(mockClient);
    const response = await tool.handler({ 
      issueId: TEST_IDS.ISSUE, 
      comment: 'No ID' 
    }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain(`on issue: ${TEST_IDS.ISSUE} (ID not available)`);
  });
});
