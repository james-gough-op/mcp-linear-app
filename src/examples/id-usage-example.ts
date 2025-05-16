/**
 * Linear ID Management Usage Examples
 * 
 * This file demonstrates best practices for using Linear entity IDs
 * in the MCP Server.
 */

import { Issue, LinearErrorType, Team } from '@linear/sdk';
import enhancedClient from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import {
  CreateIssueSchema,
  LinearEntityType,
  validateLinearId,
  validateLinearIds,
  validateTeamId
} from '../libs/id-management.js';

// Custom response type definitions using generated entity types
interface TeamResponse {
  data: {
    team: Team;
  };
}

interface IssueResponse {
  issue: Issue;
}

interface IssueCreateResponse {
  data: {
    issueCreate: {
      success: boolean;
      issue: Issue;
    };
  };
}

interface IssueUpdateResponse {
  data: {
    issueUpdate: {
      success: boolean;
      issue: Issue;
    };
  };
}

/**
 * Example 1: Basic ID validation before API call
 */
async function getTeam(teamId: string): Promise<Team> {
  try {
    // Validate the team ID before making the API call
    validateTeamId(teamId);
    
    // Proceed with API call
    const query = `
      query GetTeam($teamId: String!) {
        team(id: $teamId) {
          id
          name
          key
        }
      }
    `;
    
    const variables = { teamId };
    const response = await enhancedClient.executeGraphQLQuery(query, variables) as TeamResponse;
    return response.data.team;
  } catch (error) {
    // Handle errors with proper classification
    if (error instanceof LinearError) {
      if (error.type === LinearErrorType.InvalidInput) {
        console.error('Invalid team ID format:', error.message);
        // Handle validation error
      } else if (error.type === LinearErrorType.FeatureNotAccessible) {
        console.error('Team not found:', error.message);
        // Handle not found error
      } else {
        console.error('Linear API error:', error.message);
        // Handle other Linear API errors
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

/**
 * Example 2: Using schema validation for complex objects
 */
async function createIssue(issueData: unknown): Promise<{success: boolean; issue: Issue}> {
  try {
    // Validate the entire issue data using the schema
    const result = CreateIssueSchema.safeParse(issueData);
    
    if (!result.success) {
      // Format and handle validation errors
      const formatted = result.error.format();
      console.error('Invalid issue data:', formatted);
      throw new LinearError(
        'Invalid issue data format',
        LinearErrorType.InvalidInput,
        result.error
      );
    }
    
    // Data is valid, proceed with API call
    const validData = result.data;
    
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            title
          }
        }
      }
    `;
    
    // Convert schema data to Linear API input format
    const variables = {
      input: {
        teamId: validData.teamId,
        title: validData.title,
        description: validData.description,
        assigneeId: validData.assigneeId,
        projectId: validData.projectId
      }
    };
    
    const response = await enhancedClient.executeGraphQLMutation(mutation, variables) as IssueCreateResponse;
    return response.data.issueCreate;
  } catch (error) {
    // Re-throw with appropriate error handling
    if (error instanceof LinearError) {
      // Already a LinearError, just re-throw
      throw error;
    } else {
      // Wrap other errors
      throw new LinearError(
        `Error creating issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.Unknown,
        error
      );
    }
  }
}

/**
 * Example 3: Multiple ID validation
 */
async function moveIssueToProject(issueId: string, projectId: string): Promise<{success: boolean; issue: Issue}> {
  try {
    // Validate multiple IDs at once
    const errors = validateLinearIds({
      issue: { id: issueId, entityType: LinearEntityType.ISSUE },
      project: { id: projectId, entityType: LinearEntityType.PROJECT }
    });
    
    if (errors.length > 0) {
      // Handle validation errors
      throw new LinearError(
        `ID validation failed: ${errors.join(', ')}`,
        LinearErrorType.InvalidInput
      );
    }
    
    // All IDs are valid, proceed with API call
    const mutation = `
      mutation MoveIssue($issueId: String!, $projectId: String!) {
        issueUpdate(
          id: $issueId, 
          input: { projectId: $projectId }
        ) {
          success
          issue {
            id
            title
          }
        }
      }
    `;
    
    const variables = { issueId, projectId };
    const response = await enhancedClient.executeGraphQLMutation(mutation, variables) as IssueUpdateResponse;
    return response.data.issueUpdate;
  } catch (error) {
    // Handle and re-throw errors appropriately
    if (!(error instanceof LinearError)) {
      const linearError = new LinearError(
        `Error moving issue to project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.Unknown,
        error
      );
      
      console.error(`[${linearError.type}] ${linearError.message}`);
      throw linearError;
    }
    
    const linearError = error;
    console.error(`[${linearError.type}] ${linearError.message}`);
    throw linearError;
  }
}

/**
 * Example 4: Using safe methods with Result pattern
 */
async function safeGetIssue(issueId: string): Promise<Issue | null> {
  // Validate the issue ID
  try {
    validateLinearId(issueId, LinearEntityType.ISSUE);
  } catch (error) {
    console.error('Invalid issue ID:', error);
    return null;
  }
  
  // Use safe method that returns a Result
  const query = `
    query GetIssue($issueId: String!) {
      issue(id: $issueId) {
        id
        title
        description
        state {
          name
        }
      }
    }
  `;
  
  const result = await enhancedClient.safeExecuteGraphQLQuery<IssueResponse>(query, { issueId });
  
  if (result.success && result.data) {
    // Process successful result
    return result.data.issue;
  } else {
    // Handle error based on type
    const error = result.error;
    if (error) {
      console.error(`Error getting issue [${error.type}]: ${error.userMessage}`);
      
      // Return null for not found errors, otherwise re-throw
      if (error.type === LinearErrorType.FeatureNotAccessible) {
        return null;
      }
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

// Example usage (not executed, just for demonstration)
export const exampleUsage = async () => {
  // Using Example 1: Basic ID validation
  const team = await getTeam('123e4567-e89b-42d3-a456-556642440000');
  
  // Using Example 2: Schema validation
  const issueData = {
    teamId: '123e4567-e89b-42d3-a456-556642440000',
    title: 'Example issue',
    description: 'This is an example',
    projectId: '550e8400-e29b-41d4-a716-446655440000'
  };
  const issue = await createIssue(issueData);
  
  // Using Example 3: Multiple ID validation
  await moveIssueToProject(
    '123e4567-e89b-42d3-a456-556642440000', 
    '550e8400-e29b-41d4-a716-446655440000'
  );
  
  // Using Example 4: Safe methods with Result pattern
  const safeIssue = await safeGetIssue('123e4567-e89b-42d3-a456-556642440000');
  
  return {
    team,
    issue,
    safeIssue
  };
}; 