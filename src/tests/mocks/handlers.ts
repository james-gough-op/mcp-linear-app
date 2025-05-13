import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// GraphQL request/response types
type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

type GraphQLResponse = {
  data?: Record<string, any>;
  errors?: Array<{ message: string; [key: string]: any }>;
};

// Valid UUID v4 format
const MOCK_ISSUE_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_LABEL_ID_1 = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_LABEL_ID_2 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const EXISTING_LABEL_ID = '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b';
const MOCK_USER_ID = 'a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6';

// Mock data
const mockIssue = {
  id: MOCK_ISSUE_ID,
  title: 'Test Issue',
  labels: {
    nodes: [
      { id: EXISTING_LABEL_ID, name: 'Existing Label', color: '#CCCCCC' }
    ]
  }
};

const mockUpdatedIssue = {
  id: MOCK_ISSUE_ID,
  title: 'Test Issue',
  labels: {
    nodes: [
      { id: EXISTING_LABEL_ID, name: 'Existing Label', color: '#CCCCCC' },
      { id: MOCK_LABEL_ID_1, name: 'Bug', color: '#FF0000' },
      { id: MOCK_LABEL_ID_2, name: 'Feature', color: '#00FF00' }
    ]
  }
};

// Mock user data for authentication
const mockUser = {
  id: MOCK_USER_ID,
  name: 'Test User',
  email: 'test@example.com'
};

// Handle all GraphQL requests to Linear API
export const handlers = [
  http.post('https://api.linear.app/graphql', async ({ request }) => {
    // Log for debugging
    console.log('MSW intercepted request to Linear API');
    
    let body;
    try {
      body = await request.json() as GraphQLRequest;
      console.log('Request body:', JSON.stringify(body));
    } catch (error) {
      console.error('Error parsing request body:', error);
      return HttpResponse.json({ errors: [{ message: 'Invalid request body' }] }, { status: 400 });
    }
    
    // Handle authentication query (viewer)
    if (body.query && body.query.includes('viewer')) {
      console.log('Handling authentication request');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          viewer: mockUser
        }
      });
    }
    
    // Always return the issue for simplicity in this test environment
    if (body.query && body.query.includes('issue')) {
      console.log('Returning mock issue');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issue: mockIssue
        }
      });
    }
    
    // Handle updateIssue mutation
    if (body.query && body.query.includes('updateIssue')) {
      console.log('Returning mock updated issue');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueUpdate: {
            success: true,
            issue: mockUpdatedIssue
          }
        }
      });
    }
    
    // Default response for unhandled queries
    console.log('Unhandled GraphQL query type');
    return HttpResponse.json<GraphQLResponse>({
      errors: [{ message: 'Not implemented in MSW handler' }]
    });
  })
];

// Export the mock IDs for use in tests
export const mockIds = {
  MOCK_ISSUE_ID,
  MOCK_LABEL_ID_1,
  MOCK_LABEL_ID_2,
  EXISTING_LABEL_ID,
  MOCK_USER_ID
};

// Setup MSW server
export const server = setupServer(...handlers); 