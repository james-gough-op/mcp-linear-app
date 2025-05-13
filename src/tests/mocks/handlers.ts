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
const MOCK_NEW_LABEL_ID = '7f8e9d0c-1b2a-43c4-5d6e-7f8e9d0c1b2a';
const MOCK_TEAM_ID = '123e4567-e89b-42d3-a456-556642440000';
const MOCK_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

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

// Mock label data
const mockLabel = {
  id: MOCK_NEW_LABEL_ID,
  name: 'Bug',
  color: '#FF0000'
};

// Mock documentation label
const mockDocLabel = {
  id: MOCK_NEW_LABEL_ID,
  name: 'Documentation',
  color: '#000000'
};

// Mock project data
const mockProject = {
  id: MOCK_PROJECT_ID,
  name: "Test Project",
  description: "Test project description",
  state: "STARTED",
  color: "#FF5500",
  teams: {
    nodes: [
      {
        id: MOCK_TEAM_ID,
        name: "Test Team"
      }
    ]
  }
};

// Mock data for issue with project
const mockIssueWithProject = {
  id: MOCK_ISSUE_ID,
  identifier: "TEST-123",
  title: "Test Issue",
  project: {
    id: MOCK_PROJECT_ID,
    name: "Test Project"
  },
  labels: {
    nodes: [
      { id: EXISTING_LABEL_ID, name: 'Existing Label', color: '#CCCCCC' }
    ]
  }
};

// Mock issue creation response with project
const mockNewIssueWithProject = {
  id: MOCK_ISSUE_ID,
  identifier: "TEST-123",
  title: "Test Issue",
  description: "Test issue description",
  priority: 3, // Medium
  state: {
    id: "state-123",
    name: "In Progress"
  },
  project: {
    id: MOCK_PROJECT_ID,
    name: "Test Project"
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  url: "https://linear.app/test/issue/TEST-123"
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
    
    // Handle projectCreate mutation
    if (body.query && body.query.includes('projectCreate')) {
      console.log('Handling projectCreate mutation');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          projectCreate: {
            success: true,
            project: mockProject
          }
        }
      });
    }
    
    // Handle createIssueLabel mutation
    if (body.query && body.query.includes('createIssueLabel')) {
      console.log('Handling createIssueLabel mutation');
      
      // Check if this is the Documentation label case
      if (body.variables && body.variables.name === 'Documentation') {
        return HttpResponse.json<GraphQLResponse>({
          data: {
            issueLabelCreate: {
              success: true,
              issueLabel: mockDocLabel
            }
          }
        });
      }
      
      // Default label creation response
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueLabelCreate: {
            success: true,
            issueLabel: mockLabel
          }
        }
      });
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
    
    // Handle issueUpdate mutation for project assignment
    if (body.query && body.query.includes('issueUpdate') && body.variables?.projectId) {
      console.log('Handling issueUpdate for project assignment');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueUpdate: {
            success: true,
            issue: mockIssueWithProject
          }
        }
      });
    }
    
    // Handle general updateIssue mutation
    if (body.query && body.query.includes('updateIssue') || (body.query && body.query.includes('issueUpdate') && !body.variables?.projectId)) {
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
    
    // Handle issueCreate mutation with project
    if (body.query && body.query.includes('issueCreate') && body.variables?.projectId) {
      console.log('Handling issueCreate with project assignment');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueCreate: {
            success: true,
            issue: mockNewIssueWithProject
          }
        }
      });
    }
    
    // Handle regular issueCreate mutation
    if (body.query && body.query.includes('issueCreate')) {
      console.log('Handling issueCreate mutation');
      const newIssue = { ...mockIssue };
      newIssue.title = body.variables?.title || "New Issue";
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueCreate: {
            success: true,
            issue: newIssue
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
  MOCK_USER_ID,
  MOCK_NEW_LABEL_ID,
  MOCK_TEAM_ID,
  MOCK_PROJECT_ID
};

// Export mock data for use in tests
export const mockData = {
  mockLabel,
  mockDocLabel,
  mockProject,
  mockIssueWithProject,
  mockNewIssueWithProject
};

// Setup MSW server
export const server = setupServer(...handlers); 