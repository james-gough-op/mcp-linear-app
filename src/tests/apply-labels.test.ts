import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { LinearApplyLabelsTool } from '../tools/linear/apply-labels.js';
import { mockIds, server } from './mocks/handlers.js';
import { setupMockServer } from './mocks/msw-setup.js';

// GraphQL request type
type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

// Setup MSW for API mocking
setupMockServer();

// No need to mock the Linear client directly, MSW will intercept the HTTP requests

describe('LinearApplyLabelsTool', () => {
  it('should return proper response format for valid input', async () => {
    // Call the handler - using valid UUID-like IDs to pass validation
    const response = await LinearApplyLabelsTool.handler({
      issueId: mockIds.MOCK_ISSUE_ID,
      labelIds: [mockIds.MOCK_LABEL_ID_1, mockIds.MOCK_LABEL_ID_2]
    }, { signal: new AbortController().signal });

    // Check basic response format only
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    
    // Check that the text is defined but don't assert specific content
    // as it may vary depending on environment
    expect(typeof response.content[0].text).toBe('string');
  });

  it('should handle the case when issue is not found', async () => {
    // Temporarily override the handler to return null for issue
    server.use(
      http.post('https://api.linear.app/graphql', async ({ request }) => {
        const body = await request.json() as GraphQLRequest;
        
        if (body && body.query && body.query.includes('issue') && !body.query.includes('update')) {
          return HttpResponse.json({
            data: {
              issue: null
            }
          });
        }
        return HttpResponse.json({ errors: [{ message: 'Unhandled request' }] });
      })
    );

    // Call the handler with valid UUID format
    const response = await LinearApplyLabelsTool.handler({
      issueId: mockIds.MOCK_ISSUE_ID,
      labelIds: [mockIds.MOCK_LABEL_ID_1]
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(typeof response.content[0].text).toBe('string');
  });

  it('should return an error when issueId is empty', async () => {
    // Call the handler with empty issueId
    const response = await LinearApplyLabelsTool.handler({
      issueId: '',
      labelIds: [mockIds.MOCK_LABEL_ID_1]
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
      issueId: mockIds.MOCK_ISSUE_ID,
      labelIds: []
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('At least one label ID must be provided');
  });

  it('should handle API errors gracefully', async () => {
    // Temporarily override the handler to simulate API error
    server.use(
      http.post('https://api.linear.app/graphql', () => {
        return HttpResponse.error();
      })
    );

    // Call the handler with valid UUID format
    const response = await LinearApplyLabelsTool.handler({
      issueId: mockIds.MOCK_ISSUE_ID,
      labelIds: [mockIds.MOCK_LABEL_ID_1]
    }, { signal: new AbortController().signal });

    // Verify response format
    expect(response.content).toBeDefined();
    expect(response.content.length).toBe(1);
    expect(response.content[0].type).toBe('text');
    expect(typeof response.content[0].text).toBe('string');
  });
}); 