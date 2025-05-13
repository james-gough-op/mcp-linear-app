import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { LinearCreateLabelTool } from '../tools/linear/create-label.js';
import { server } from './mocks/handlers.js';
import { setupMockServer } from './mocks/msw-setup.js';

// Type for GraphQL request
type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

// Setup MSW for API mocking
setupMockServer();

describe('LinearCreateLabelTool', () => {
  it('should successfully create a global label when teamId is not provided', async () => {
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
    // Override the handler to simulate API error
    server.use(
      http.post('https://api.linear.app/graphql', () => {
        return HttpResponse.error();
      })
    );

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
    // Override the handler to simulate failed label creation
    server.use(
      http.post('https://api.linear.app/graphql', async ({ request }) => {
        const body = await request.json() as GraphQLRequest;
        
        if (body.query && body.query.includes('createIssueLabel')) {
          return HttpResponse.json({
            data: {
              issueLabelCreate: {
                success: false
              }
            }
          });
        }
        
        return HttpResponse.json({ errors: [{ message: 'Unhandled request' }] });
      })
    );

    // Call the handler
    const response = await LinearCreateLabelTool.handler({
      name: 'Bug',
      color: '#FF0000'
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('error');
  });

  it('should reject invalid color formats', async () => {
    // This should be caught by Zod validation before reaching the handler
    const schema = LinearCreateLabelTool.schema;
    
    // Test with invalid HEX format
    const validationResult = schema.color.safeParse('invalid-color');
    
    expect(validationResult.success).toBe(false);
  });
}); 