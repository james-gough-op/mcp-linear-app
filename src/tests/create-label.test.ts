import { beforeEach, describe, expect, it, vi } from 'vitest';
import linearClient from '../libs/client.js';
import { LinearCreateLabelTool } from '../tools/linear/create-label.js';

// Mock the Linear client
vi.mock('../libs/client.js', () => {
  const createIssueLabelMock = vi.fn();
  return {
    __esModule: true,
    default: {
      createIssueLabel: createIssueLabelMock
    }
  };
});

describe('LinearCreateLabelTool', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('should successfully create a global label when teamId is not provided', async () => {
    // Mock the Linear client response
    const mockLabel = {
      id: 'mock-label-id',
      name: 'Bug',
      color: '#FF0000'
    };

    const mockResponse = {
      success: true,
      issueLabel: Promise.resolve(mockLabel)
    };

    // Setup the mock implementation
    const mockFn = linearClient.createIssueLabel as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValue(mockResponse);

    // Call the handler directly
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Check only response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBeDefined();
  });

  it('should use default color when not provided', async () => {
    // Mock the Linear client response
    const mockLabel = {
      id: 'mock-label-id',
      name: 'Documentation',
      color: '#000000'
    };

    const mockResponse = {
      success: true,
      issueLabel: Promise.resolve(mockLabel)
    };

    // Setup the mock implementation
    const mockFn = linearClient.createIssueLabel as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValue(mockResponse);

    // Call the handler directly
    const response = await LinearCreateLabelTool.handler({
      name: 'Documentation'
    }, { signal: new AbortController().signal });

    // Basic validation of response
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
  });

  it('should return an error when label name is empty', async () => {
    // Call the handler with empty name
    const response = await LinearCreateLabelTool.handler({
      name: '',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify error message format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Label name is required');
  });

  it('should handle API errors gracefully', async () => {
    // Mock an API error
    const mockFn = linearClient.createIssueLabel as ReturnType<typeof vi.fn>;
    mockFn.mockRejectedValue(new Error('API connection failed'));

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify error handling
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('An error occurred');
    expect(response.content[0].text).toContain('API connection failed');
  });

  it('should handle failed label creation', async () => {
    // Mock a failed response (success: false)
    const mockFn = linearClient.createIssueLabel as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValue({
      success: false
    });

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
  });

  it('should reject invalid color formats', async () => {
    // This should be caught by Zod validation before reaching the handler
    const schema = LinearCreateLabelTool.schema;
    
    // Test with invalid HEX format
    const validationResult = schema.color.safeParse('invalid-color');
    
    expect(validationResult.success).toBe(false);
  });
}); 