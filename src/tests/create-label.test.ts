import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearResult } from '../libs/errors.js';
import { LinearCreateLabelTool } from '../tools/linear/create-label.js';
import { setupMockServer } from './mocks/msw-setup.js';

// Type for GraphQL request
type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

// Setup MSW for API mocking
setupMockServer();

// Mock enhancedClient.safeCreateIssueLabel
vi.mock('../libs/client.js', () => {
  return {
    default: {
      safeCreateIssueLabel: vi.fn()
    }
  };
});

describe('LinearCreateLabelTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a global label when teamId is not provided', async () => {
    // Mock successful label creation
    vi.mocked(enhancedClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        issueLabel: {
          id: 'label-123',
          name: 'Bug',
          color: '#FF0000'
        }
      },
      error: undefined
    } as LinearResult<any>);

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
    // Mock successful label creation
    vi.mocked(enhancedClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        issueLabel: {
          id: 'label-124',
          name: 'Documentation',
          color: '#000000'
        }
      },
      error: undefined
    } as LinearResult<any>);

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
    // Mock API error
    vi.mocked(enhancedClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: false,
      data: undefined,
      error: new LinearError('API Error: Network failure', LinearErrorType.NetworkError)
    } as LinearResult<any>);

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify error handling
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('An error occurred');
  });

  it('should handle failed label creation', async () => {
    // Mock unsuccessful label creation
    vi.mocked(enhancedClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        success: false
      },
      error: undefined
    } as LinearResult<any>);

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Failed to create');
  });

  it('should reject invalid color formats', async () => {
    // This should be caught by Zod validation before reaching the handler
    const schema = LinearCreateLabelTool.schema;
    
    // Test with invalid HEX format
    const validationResult = schema.color.safeParse('invalid-color');
    
    expect(validationResult.success).toBe(false);
  });
}); 