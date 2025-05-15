/**
 * Linear Client Migration Utilities
 * 
 * This module provides helper utilities for migrating from the Linear SDK client
 * to the enhanced GraphQL client implementation.
 */

import { LinearError, LinearErrorType, LinearResult, createErrorResult, createSuccessResult } from './errors.js';
import { LinearEntityType } from './id-management.js';

// Interface defining the required methods for a client implementation
export interface GraphQLClient {
  executeGraphQLQuery: <T>(query: string, variables: Record<string, unknown>) => Promise<{data?: T}>;
}

/**
 * Transforms a method result from the original Linear SDK client to match
 * the format expected from the enhancedClient GraphQL implementation
 * 
 * @param sdkResult Result from the original SDK client
 * @returns Transformed result matching GraphQL structure
 */
export function transformSdkResult<T>(sdkResult: any): T {
  // Transform specific fields based on entity type
  // This is a placeholder that will be expanded based on specific entity requirements
  return sdkResult as T;
}

/**
 * Builds a GraphQL query that selects all required fields for an entity
 * 
 * @param entityType The type of entity to build a query for
 * @param includeRelationships Whether to include relationship fields
 * @returns GraphQL query string
 */
export function buildGraphQLQuery(entityType: LinearEntityType, includeRelationships: boolean = true): string {
  // Base query structure
  let query: string;
  
  // Query variables
  const variables: string[] = [];
  
  // Entity-specific field selection
  let fields: string[];
  
  switch (entityType) {
    case LinearEntityType.ISSUE:
      variables.push('$issueId: String!');
      fields = getIssueFields(includeRelationships);
      query = `
        query GetIssue(${variables.join(', ')}) {
          issue(id: $issueId) {
            ${fields.join('\n            ')}
          }
        }
      `;
      break;
      
    case LinearEntityType.COMMENT:
      variables.push('$commentId: String!');
      fields = getCommentFields(includeRelationships);
      query = `
        query GetComment(${variables.join(', ')}) {
          comment(id: $commentId) {
            ${fields.join('\n            ')}
          }
        }
      `;
      break;
      
    case LinearEntityType.TEAM:
      variables.push('$teamId: String!');
      fields = getTeamFields(includeRelationships);
      query = `
        query GetTeam(${variables.join(', ')}) {
          team(id: $teamId) {
            ${fields.join('\n            ')}
          }
        }
      `;
      break;
    
    // Add more entity types as needed
    
    default:
      throw new LinearError(
        `Unsupported entity type: ${entityType}`,
        LinearErrorType.VALIDATION
      );
  }
  
  return query;
}

/**
 * Get fields for Issue entity
 */
export function getIssueFields(includeRelationships: boolean = true): string[] {
  // Primary fields always included
  const primaryFields = [
    'id',
    'title',
    'description',
    'number',
    'priority',
    'estimate',
    'branchName',
    'dueDate',
    'snoozedUntilAt',
    'completedAt',
    'canceledAt',
    'autoClosedAt',
    'archivedAt',
    'startedAt',
    'subIssueSortOrder',
    'createdAt',
    'updatedAt',
    'url',
    'boardOrder',
    'customerTickerCount',
    'stateOrder',
    'sortOrder',
    'previousIdentifiers',
    'creatorId',
    'teamId',
    'cycleId',
    'projectId',
    'projectMilestoneId',
    'parentId',
    'priorityLabel'
  ];
  
  // Relationship fields included conditionally
  const relationshipFields = includeRelationships ? [
    'labels { nodes { id name color } }',
    'team { id name key }',
    'state { id name color type }',
    'parent { id title }',
    'project { id name }',
    'cycle { id name number }',
    'children { nodes { id title } }',
    'assignee { id name displayName email }',
    'creator { id name }'
  ] : [];
  
  return [...primaryFields, ...relationshipFields];
}

/**
 * Get fields for Comment entity
 */
export function getCommentFields(includeRelationships: boolean = true): string[] {
  // Primary fields always included
  const primaryFields = [
    'id',
    'body',
    'createdAt',
    'updatedAt',
    'issueId',
    'userId'
  ];
  
  // Relationship fields included conditionally
  const relationshipFields = includeRelationships ? [
    'issue { id title }',
    'user { id name email }'
  ] : [];
  
  return [...primaryFields, ...relationshipFields];
}

/**
 * Get fields for Team entity
 */
export function getTeamFields(includeRelationships: boolean = true): string[] {
  // Primary fields always included
  const primaryFields = [
    'id',
    'name',
    'key',
    'description',
    'createdAt',
    'updatedAt',
    'color'
  ];
  
  // Relationship fields included conditionally
  const relationshipFields = includeRelationships ? [
    'members { nodes { id name email } }',
    'projects { nodes { id name } }',
    'cycles { nodes { id name number } }',
    'states { nodes { id name color type } }'
  ] : [];
  
  return [...primaryFields, ...relationshipFields];
}

/**
 * Creates a standardized method implementation function that handles common patterns
 * 
 * @param entity The entity type for this method
 * @param queryBuilder Function that builds the GraphQL query
 * @param validateParams Function that validates parameters
 * @param responseTransformer Function that transforms the response
 * @returns A method implementation that can be added to enhancedClient
 */
export function createEntityMethod<TParams, TResult>(
  entity: LinearEntityType,
  queryBuilder: (params: TParams) => { query: string; variables: Record<string, unknown> },
  validateParams: (params: TParams) => void,
  responseTransformer: (data: any) => TResult
): (this: GraphQLClient, params: TParams) => Promise<TResult> {
  return async function(this: GraphQLClient, params: TParams): Promise<TResult> {
    try {
      // Validate parameters
      validateParams(params);
      
      // Build query and variables
      const { query, variables } = queryBuilder(params);
      
      // Execute GraphQL query
      const response = await this.executeGraphQLQuery(query, variables);
      
      // Check for missing data
      if (!response.data) {
        throw new LinearError(
          `No data returned for ${entity}`,
          LinearErrorType.NOT_FOUND
        );
      }
      
      // Transform response
      return responseTransformer(response.data);
      
    } catch (error) {
      // Handle errors
      if (error instanceof LinearError) {
        throw error;
      }
      
      throw new LinearError(
        `Error in ${entity} method: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
    }
  };
}

/**
 * Creates a safe version of a method (returning LinearResult instead of throwing)
 * 
 * @param method The original method that may throw errors
 * @returns A safe version that returns LinearResult
 */
export function createSafeMethod<TParams, TResult>(
  method: (this: GraphQLClient, params: TParams) => Promise<TResult>
): (this: GraphQLClient, params: TParams) => Promise<LinearResult<TResult>> {
  return async function(this: GraphQLClient, params: TParams): Promise<LinearResult<TResult>> {
    try {
      const result = await method.call(this, params);
      return createSuccessResult<TResult>(result);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<TResult>(error);
      }
      
      const linearError = new LinearError(
        `Error in safe method: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LinearErrorType.UNKNOWN,
        error
      );
      
      return createErrorResult<TResult>(linearError);
    }
  };
}

/**
 * Helper to create complete method pairs (standard and safe versions)
 * 
 * @param client The client object to attach methods to
 * @param methodName Name of the standard method
 * @param safeMethodName Name of the safe method
 * @param implementation The method implementation
 */
export function createMethodPair<TParams, TResult>(
  client: any,
  methodName: string,
  safeMethodName: string,
  implementation: (this: GraphQLClient, params: TParams) => Promise<TResult>
): void {
  // Add the standard method
  client[methodName] = implementation;
  
  // Add the safe version
  client[safeMethodName] = createSafeMethod(implementation);
}

/**
 * Utility to compare results between original linearClient and enhancedClient
 * Useful for testing and validation during migration
 * 
 * @param linearClientResult Result from original client
 * @param enhancedClientResult Result from enhanced client
 * @returns Object with comparison results
 */
export function compareClientResults<T>(
  linearClientResult: any,
  enhancedClientResult: T
): { 
  fieldsMatch: boolean; 
  missingFields: string[]; 
  additionalFields: string[]; 
  mismatchedFields: string[] 
} {
  const linearFields = new Set(Object.keys(linearClientResult));
  const enhancedFields = new Set(Object.keys(enhancedClientResult as object));
  
  const missingFields = [...linearFields].filter(field => !enhancedFields.has(field));
  const additionalFields = [...enhancedFields].filter(field => !linearFields.has(field));
  
  const commonFields = [...linearFields].filter(field => enhancedFields.has(field));
  const mismatchedFields = commonFields.filter(field => {
    // Compare primitive values
    if (
      typeof linearClientResult[field] !== 'object' || 
      linearClientResult[field] === null
    ) {
      return linearClientResult[field] !== (enhancedClientResult as any)[field];
    }
    // For objects, just check existence
    return false;
  });
  
  return {
    fieldsMatch: missingFields.length === 0 && mismatchedFields.length === 0,
    missingFields,
    additionalFields,
    mismatchedFields
  };
} 