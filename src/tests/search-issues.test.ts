import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createLinearSearchIssuesTool, PriorityStringToNumber } from '../tools/linear/search-issues.js';

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

interface HasSafeIssues {
  safeIssues: Mock;
}

describe('LinearSearchIssuesTool (DI pattern)', () => {
  let mockClient: HasSafeIssues;

  beforeEach(() => {
    mockClient = {
      safeIssues: vi.fn(),
    };
  });

  it('should return search results with issues', async () => {
    mockClient.safeIssues.mockResolvedValueOnce({
      success: true,
      data: { nodes: mockIssues },
    });
    const tool = createLinearSearchIssuesTool(mockClient as HasSafeIssues);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('Success: Issues search results');
    expect(response.content[0].text).toContain('First issue');
    expect(response.content[0].text).toContain('Second issue');
  });

  it('should return no results if none match', async () => {
    mockClient.safeIssues.mockResolvedValueOnce({
      success: true,
      data: { nodes: [] },
    });
    const tool = createLinearSearchIssuesTool(mockClient as HasSafeIssues);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('No issues found');
  });

  it('should handle error from safeIssues', async () => {
    mockClient.safeIssues.mockResolvedValueOnce({
      success: false,
      error: { message: 'API error' },
    });
    const tool = createLinearSearchIssuesTool(mockClient as HasSafeIssues);
    const response = await tool.handler({ limit: 2, skip: 0 }, { signal: new AbortController().signal });
    expect(response.content[0].text).toContain('API error');
  });
}); 