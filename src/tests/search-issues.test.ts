import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearSearchIssuesTool, PriorityStringToNumber } from '../tools/linear/search-issues.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses
} from './utils/test-utils.js';

const mockState = { name: 'Todo' };
const mockIssues = [
  {
    id: 'issue-1',
    title: 'First issue',
    description: 'Desc 1',
    priority: PriorityStringToNumber.high,
    state: Promise.resolve(mockState),
  },
  {
    id: 'issue-2',
    title: 'Second issue',
    description: 'Desc 2',
    priority: PriorityStringToNumber.low,
    state: Promise.resolve(mockState),
  },
];

describe('LinearSearchIssuesTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should return search results with issues', async () => {
    mockClient.safeIssues.mockResolvedValueOnce(
      createSuccessResponse({
        nodes: mockIssues,
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      })
    );
    
    const tool = createLinearSearchIssuesTool(mockClient);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Issues search results');
    expect(response.content[0].text).toContain('First issue');
    expect(response.content[0].text).toContain('Second issue');
  });

  it('should return no results if none match', async () => {
    mockClient.safeIssues.mockResolvedValueOnce(
      createSuccessResponse({
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      })
    );
    
    const tool = createLinearSearchIssuesTool(mockClient);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('No issues found');
  });

  it('should handle error from safeIssues', async () => {
    mockClient.safeIssues.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API error', LinearErrorType.Unknown)
    );
    
    const tool = createLinearSearchIssuesTool(mockClient);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('API error');
  });
}); 