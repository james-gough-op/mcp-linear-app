import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Issue } from '../generated/linear-types.js';
import linearClient from '../libs/client.js';
import { LinearApplyLabelsTool } from '../tools/linear/apply-labels.js';

// Mock the Linear client
vi.mock('../libs/client.js', () => {
  const issueMock = vi.fn();
  const updateIssueMock = vi.fn();
  return {
    __esModule: true,
    default: {
      issue: issueMock,
      updateIssue: updateIssueMock
    }
  };
});

describe('LinearApplyLabelsTool', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('should return proper response format for valid input', async () => {
    // Mock issue data
    const mockIssue = {
      id: 'issue-123',
      title: 'Test Issue',
      labels: vi.fn().mockResolvedValue({
        nodes: [
          { id: 'existing-label-1', name: 'Existing Label', color: '#CCCCCC' }
        ]
      })
    };

    // Mock the updated issue data
    const mockUpdatedIssue = {
      id: 'issue-123',
      title: 'Test Issue',
      labels: vi.fn().mockResolvedValue({
        nodes: [
          { id: 'existing-label-1', name: 'Existing Label', color: '#CCCCCC' },
          { id: 'new-label-1', name: 'Bug', color: '#FF0000' },
          { id: 'new-label-2', name: 'Feature', color: '#00FF00' }
        ]
      })
    };

    // Setup mocks
    const issueMock = linearClient.issue as ReturnType<typeof vi.fn>;
    issueMock
      .mockResolvedValueOnce(mockIssue as unknown as Issue)
      .mockResolvedValueOnce(mockUpdatedIssue as unknown as Issue);

    const updateIssueMock = linearClient.updateIssue as ReturnType<typeof vi.fn>;
    updateIssueMock.mockResolvedValue({
      success: true
    });

    // Call the handler - using UUID-like IDs to pass validation
    const response = await LinearApplyLabelsTool.handler({
      issueId: '123e4567-e89b-12d3-a456-426614174000',
      labelIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']
    }, { signal: new AbortController().signal });

    // Check basic response format only
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBeDefined();
  });

  it('should handle the case when issue is not found', async () => {
    // Mock issue not found
    const issueMock = linearClient.issue as ReturnType<typeof vi.fn>;
    issueMock.mockResolvedValue(null);

    // Call the handler with valid UUID format
    const response = await LinearApplyLabelsTool.handler({
      issueId: '123e4567-e89b-12d3-a456-426614174000',
      labelIds: ['123e4567-e89b-12d3-a456-426614174001']
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
  });

  it('should return an error when issueId is empty', async () => {
    // Call the handler with empty issueId
    const response = await LinearApplyLabelsTool.handler({
      issueId: '',
      labelIds: ['123e4567-e89b-12d3-a456-426614174001']
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Invalid Linear ID format');
  });

  it('should return an error when labelIds array is empty', async () => {
    // Call the handler with empty labelIds array
    const response = await LinearApplyLabelsTool.handler({
      issueId: '123e4567-e89b-12d3-a456-426614174000',
      labelIds: []
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('At least one label ID must be provided');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    const issueMock = linearClient.issue as ReturnType<typeof vi.fn>;
    issueMock.mockRejectedValue(new Error('API connection failed'));

    // Call the handler with valid UUID format
    const response = await LinearApplyLabelsTool.handler({
      issueId: '123e4567-e89b-12d3-a456-426614174000',
      labelIds: ['123e4567-e89b-12d3-a456-426614174001']
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
  });
}); 