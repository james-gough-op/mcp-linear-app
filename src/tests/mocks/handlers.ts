import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
    createMockErrorResponse,
    createMockIssue,
    createMockIssueCreateResponse,
    createMockIssueResponse,
    createMockIssuesResponse,
    createMockLabel,
    createMockProject,
    createMockTeamResponse,
    createMockUser,
    MOCK_IDS
} from './mock-data.js';

// GraphQL request/response types
type GraphQLRequest = {
  query: string;
  variables?: Record<string, unknown>;
};

type GraphQLResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; [key: string]: unknown }>;
};

// Special case mock data
const mockUpdatedIssue = createMockIssue({
  labels: {
    nodes: [
      { id: MOCK_IDS.LABEL, name: 'Bug', color: '#FF0000' },
      { id: MOCK_IDS.LABEL + '1', name: 'Feature', color: '#00FF00' }
    ]
  }
});

const mockIssueWithProject = createMockIssue({
  project: createMockProject()
});

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
      return HttpResponse.json(
        createMockErrorResponse('Invalid request body', 'BAD_REQUEST'), 
        { status: 400 }
      );
    }
    
    // Handle projectCreate mutation
    if (body.query && body.query.includes('projectCreate')) {
      console.log('Handling projectCreate mutation');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          projectCreate: {
            success: true,
            project: createMockProject({
              name: body.variables?.name || 'New Project'
            })
          }
        }
      });
    }
    
    // Handle createIssueLabel mutation
    if (body.query && body.query.includes('createIssueLabel') || body.query && body.query.includes('issueLabelCreate')) {
      console.log('Handling createIssueLabel mutation');
      
      // Check if this is a specific label case
      if (body.variables && body.variables.name) {
        return HttpResponse.json<GraphQLResponse>({
          data: {
            issueLabelCreate: {
              success: true,
              issueLabel: createMockLabel({
                name: body.variables.name,
                color: body.variables.color || '#FF0000'
              })
            }
          }
        });
      }
      
      // Default label creation response
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueLabelCreate: {
            success: true,
            issueLabel: createMockLabel()
          }
        }
      });
    }
    
    // Handle authentication query (viewer)
    if (body.query && body.query.includes('viewer')) {
      console.log('Handling authentication request');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          viewer: createMockUser()
        }
      });
    }
    
    // Handle issue query with specific ID
    if (body.query && body.query.includes('issue(id:') && body.variables?.issueId) {
      console.log('Handling issue query with ID');
      
      // Special case for testing not found behavior
      if (body.variables.issueId === 'not_found_id') {
        return HttpResponse.json(
          createMockErrorResponse('Issue not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }
      
      return HttpResponse.json(createMockIssueResponse());
    }
    
    // Handle general issue query
    if (body.query && body.query.includes('issue')) {
      console.log('Returning mock issue');
      return HttpResponse.json(createMockIssueResponse());
    }
    
    // Handle team query
    if (body.query && body.query.includes('team(id:') && body.variables?.teamId) {
      console.log('Handling team query with ID');
      return HttpResponse.json(createMockTeamResponse());
    }
    
    // Handle issues query (connection)
    if (body.query && body.query.includes('issues(')) {
      console.log('Handling issues connection query');
      return HttpResponse.json(createMockIssuesResponse());
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
    if ((body.query && body.query.includes('updateIssue')) || 
        (body.query && body.query.includes('issueUpdate') && !body.variables?.projectId)) {
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
      return HttpResponse.json(createMockIssueCreateResponse({
        title: body.variables.title || 'New Issue',
        projectId: body.variables.projectId,
        project: createMockProject()
      }));
    }
    
    // Handle regular issueCreate mutation
    if (body.query && body.query.includes('issueCreate')) {
      console.log('Handling issueCreate mutation');
      return HttpResponse.json(createMockIssueCreateResponse({
        title: body.variables?.title || 'New Issue'
      }));
    }
    
    // Handle adding issue to cycle
    if (body.query && body.query.includes('issueUpdate') && body.variables?.cycleId) {
      console.log('Handling adding issue to cycle');
      return HttpResponse.json<GraphQLResponse>({
        data: {
          issueUpdate: {
            success: true,
            issue: createMockIssue({
              cycleId: body.variables.cycleId
            })
          }
        }
      });
    }
    
    // Handle unknown queries
    console.log('Unknown GraphQL query type, returning generic success response');
    return HttpResponse.json<GraphQLResponse>({
      data: {
        success: true
      }
    });
  })
];

// Set up the server to use in tests
export const server = setupServer(...handlers); 