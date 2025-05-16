import { beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import * as idManagement from '../libs/id-management.js';
import { LinearAddIssueToCycleTool } from '../tools/linear/add-issue-to-cycle.js';

// Mock UUIDs for testing
const MOCK_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_CYCLE_ID = '7f8e9d0c-1b2a-43c4-a716-446655440000';
const INVALID_ID = 'not-a-valid-uuid';

// Setup mocks
vi.mock('../libs/client.js', () => {
  return {
    default: {
      executeGraphQLMutation: vi.fn()
    }
  };
});

// Sample successful response
const successResponse = {
  data: {
    issueUpdate: {
      success: true,
      issue: {
        id: MOCK_ISSUE_ID,
        identifier: 'ENG-123',
        title: 'Test Issue',
        cycle: {
          id: MOCK_CYCLE_ID,
          name: 'Sprint 42',
          number: 42
        }
      }
    }
  }
};

// Sample failed response
const failedResponse = {
  data: {
    issueUpdate: {
      success: false
    }
  }
};

describe('LinearAddIssueToCycleTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should successfully add an issue to a cycle', async () => {
    // Mock the enhanced client to return a successful response
    vi.mocked(enhancedClient.executeGraphQLMutation).mockResolvedValueOnce(successResponse);

    // Call the handler
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: MOCK_ISSUE_ID,
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });

    // Verify client was called with correct parameters
    expect(enhancedClient.executeGraphQLMutation).toHaveBeenCalledWith(
      expect.stringContaining('issueUpdate'),
      {
        issueId: MOCK_ISSUE_ID,
        cycleId: MOCK_CYCLE_ID
      }
    );

    // Verify the response format
    expect(response.content[0].text).toContain('Successfully added issue');
    expect(response.content[0].text).toContain('ENG-123');
    expect(response.content[0].text).toContain('Sprint 42');
    expect(response.content[0].text).toContain('#42');
  });

  it('should handle failed update from Linear API', async () => {
    // Mock the enhanced client to return a failed response
    vi.mocked(enhancedClient.executeGraphQLMutation).mockResolvedValueOnce(failedResponse);

    // Call the handler
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: MOCK_ISSUE_ID,
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });

    // Verify the response contains an error message
    expect(response.content[0].text).toContain('Failed to add issue to cycle');
  });

  it('should reject empty issueId', async () => {
    // Call with empty issueId
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: '',
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });

    // Verify validation error
    expect(response.content[0].text).toContain('Validation error: issueId: Invalid Linear ID format');
    expect(enhancedClient.executeGraphQLMutation).not.toHaveBeenCalled();
  });

  it('should reject empty cycleId', async () => {
    // Call with empty cycleId
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: MOCK_ISSUE_ID,
      cycleId: ''
    }, { signal: new AbortController().signal });

    // Verify validation error
    expect(response.content[0].text).toContain('Validation error: cycleId: Invalid Linear ID format');
    expect(enhancedClient.executeGraphQLMutation).not.toHaveBeenCalled();
  });

  it('should reject invalid issueId format', async () => {
    // Create a spy on LinearIdSchema.parse to simulate validation error for issueId
    const parseSpy = vi.spyOn(idManagement.LinearIdSchema, 'parse');
    parseSpy.mockImplementationOnce(() => {
      throw new Error('Invalid Linear ID format');
    });

    // Call with invalid issueId
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: INVALID_ID,
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });

    // Verify validation error
    expect(response.content[0].text).toContain('Validation error: issueId: Invalid Linear ID format');
    expect(enhancedClient.executeGraphQLMutation).not.toHaveBeenCalled();
  });

  it('should reject invalid cycleId format', async () => {
    // First call to parse will pass (issueId), second will fail (cycleId)
    const parseSpy = vi.spyOn(idManagement.LinearIdSchema, 'parse');
    parseSpy.mockImplementationOnce(() => MOCK_ISSUE_ID); // issueId passes
    parseSpy.mockImplementationOnce(() => {
      throw new Error('Invalid Linear ID format');
    });

    // Call with invalid cycleId
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: MOCK_ISSUE_ID,
      cycleId: INVALID_ID
    }, { signal: new AbortController().signal });

    // Verify validation error
    expect(response.content[0].text).toContain('Validation error: cycleId: Invalid Linear ID format');
    expect(enhancedClient.executeGraphQLMutation).not.toHaveBeenCalled();
  });

  it('should handle API errors during the update', async () => {
    // Mock API error
    vi.mocked(enhancedClient.executeGraphQLMutation).mockRejectedValueOnce(
      new Error('API Error: Cycle not found')
    );
    
    // Call the handler
    const response = await LinearAddIssueToCycleTool.handler({
      issueId: MOCK_ISSUE_ID,
      cycleId: MOCK_CYCLE_ID
    }, { signal: new AbortController().signal });
    
    // Verify error was properly passed through
    expect(response.content[0].text).toContain('An error occurred while adding the issue to cycle');
    expect(response.content[0].text).toContain('API Error: Cycle not found');
  });
}); 