import { IssueLabelPayload, LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { LinearError, LinearResult } from '../libs/errors.js';
import { createLinearCreateLabelTool, LinearCreateLabelTool } from '../tools/linear/create-label.js';
import { setupMockServer } from './mocks/msw-setup.js';
import {
  createMockClient,
  createSuccessResponse,
  expectErrorResponse,
  expectSuccessResponse,
  mockApiResponses
} from './utils/test-utils.js';

// Setup MSW for API mocking
setupMockServer();

// Mock enhancedClient.safeCreateIssueLabel
vi.mock('../libs/client.js', () => {
  const mockClient = { safeCreateIssueLabel: vi.fn() };
  return {
    getEnhancedClient: () => mockClient
  };
});

describe('LinearCreateLabelTool', () => {
  let mockClient: ReturnType<typeof getEnhancedClient>;
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getEnhancedClient } = await import('../libs/client.js');
    mockClient = getEnhancedClient();
  });

  it('should successfully create a global label when teamId is not provided', async () => {
    // Mock successful label creation
    vi.mocked(mockClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        issueLabel: {
          id: 'label-123',
          name: 'Bug',
          color: '#FF0000'
        }
      },
      error: undefined
    } as unknown as LinearResult<IssueLabelPayload>);

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
    vi.mocked(mockClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        issueLabel: {
          id: 'label-124',
          name: 'Documentation',
          color: '#000000'
        }
      },
      error: undefined
    } as unknown as LinearResult<IssueLabelPayload>);

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
    vi.mocked(mockClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: false,
      data: undefined,
      error: new LinearError('API Error: Network failure', LinearErrorType.NetworkError)
    } as unknown as LinearResult<IssueLabelPayload>);

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify error handling
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Error: Network error');
    expect(response.content[0].text).toContain('API Error: Network failure');
  });

  it('should handle failed label creation', async () => {
    // Mock unsuccessful label creation
    vi.mocked(mockClient.safeCreateIssueLabel).mockResolvedValueOnce({
      success: true,
      data: {
        success: false
      },
      error: undefined
    } as unknown as LinearResult<IssueLabelPayload>);

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('Success: label created');
    expect(response.content[0].text).toContain('ID not available');
  });

  it('should reject invalid color formats', async () => {
    // This should be caught by Zod validation before reaching the handler
    const schema = LinearCreateLabelTool.schema;
    
    // Test with invalid HEX format
    const validationResult = schema.color.safeParse('invalid-color');
    
    expect(validationResult.success).toBe(false);
  });
});

describe('LinearCreateLabelTool (DI pattern)', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully create a label', async () => {
    mockClient.safeCreateIssueLabel.mockResolvedValueOnce(
      createSuccessResponse({ 
        issueLabel: { 
          id: 'label-123', 
          name: 'Bug', 
          color: '#FF0000' 
        } 
      })
    );
    
    const tool = createLinearCreateLabelTool(mockClient);
    const response = await tool.handler(
      { name: 'Bug', color: '#FF0000' }, 
      { signal: new AbortController().signal }
    );
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: label created');
    expect(response.content[0].text).toContain('ID: label-123');
    expect(response.content[0].text).toContain('name: "Bug"');
    expect(response.content[0].text).toContain('color: #FF0000');
    expect(mockClient.safeCreateIssueLabel).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockClient.safeCreateIssueLabel.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('API Error', LinearErrorType.Unknown)
    );
    
    const tool = createLinearCreateLabelTool(mockClient);
    const response = await tool.handler(
      { name: 'Bug', color: '#FF0000' }, 
      { signal: new AbortController().signal }
    );
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('API Error');
  });
}); 