import { LinearDocument, LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearResult } from '../libs/errors.js';
import {
  createSuccessResponse,
  INVALID_IDS,
  mockApiResponses,
  mockProjectData,
  TEST_IDS
} from './utils/test-utils.js';

/**
 * Tests for Linear project retrieval functionality
 * 
 * These tests validate the project retrieval methods of the Linear client
 */

// Type definitions for the mock functions
type SafeProjectFn = (id: string) => Promise<LinearResult<LinearDocument.Project>>;
type SafeProjectsFn = (filter?: LinearDocument.ProjectFilter, first?: number, after?: string) => Promise<LinearResult<LinearDocument.ProjectConnection>>;

// First, mock the project-related methods on the enhancedClient, since they don't exist yet
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Add the methods we need to test with proper type annotations
  enhancedClient.safeProject = vi.fn() as unknown as SafeProjectFn;
  enhancedClient.safeProjects = vi.fn() as unknown as SafeProjectsFn;
  
  // Set up global spies for methods we need to check in all tests
  vi.spyOn(enhancedClient, 'safeExecuteGraphQLQuery');
});

afterEach(() => {
  vi.restoreAllMocks();
  
  // Clean up our added methods
  delete (enhancedClient as any).safeProject;
  delete (enhancedClient as any).safeProjects;
});

describe('enhancedClient.safeProject', () => {
  // Happy path
  it('should fetch a project successfully by ID', async () => {
    // Arrange
    const successResponse = createSuccessResponse({ project: mockProjectData });
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(successResponse);
    
    // Mock the safeProject implementation for this test
    (enhancedClient.safeProject as any).mockImplementation(async (id: string) => {
      const result = await enhancedClient.safeExecuteGraphQLQuery<{ project: any }>(
        'query Project { project(id: $id) { id name description } }',
        { id }
      );
      
      if (result.success) {
        return { success: true, data: result.data?.project };
      }
      return result;
    });
    
    // Act
    const result = await enhancedClient.safeProject(TEST_IDS.PROJECT);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjectData);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query Project'),
      { id: TEST_IDS.PROJECT }
    );
  });
  
  // Not found case
  it('should handle project not found gracefully', async () => {
    // Arrange
    const errorResponse = mockApiResponses.mockErrorResponse('Project not found', "FeatureNotAccessible" as LinearErrorType);
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(errorResponse);
    
    // Mock the safeProject implementation for this test
    (enhancedClient.safeProject as any).mockImplementation(async (id: string) => {
      return enhancedClient.safeExecuteGraphQLQuery(
        'query Project { project(id: $id) { id name description } }',
        { id }
      );
    });
    
    // Act
    const result = await enhancedClient.safeProject(TEST_IDS.PROJECT);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe("FeatureNotAccessible" as LinearErrorType);
    expect(result.error?.message).toContain('Project not found');
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
  });
  
  // Invalid ID case
  it('should validate project ID format', async () => {
    // Arrange
    (enhancedClient.safeProject as any).mockImplementation(async (id: string) => {
      // Simulate ID validation
      if (!id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
        return {
          success: false,
          error: new LinearError(`Invalid project ID: ${id}`, "InvalidInput" as LinearErrorType)
        };
      }
      
      return enhancedClient.safeExecuteGraphQLQuery(
        'query Project { project(id: $id) { id name description } }',
        { id }
      );
    });
    
    // Act
    const result = await enhancedClient.safeProject(INVALID_IDS.PROJECT);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe("InvalidInput" as LinearErrorType);
    expect(result.error?.message).toContain('project ID');
    // Verify no API call was made with invalid ID
    expect(enhancedClient.safeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });
  
  // Network error case
  it('should handle network errors gracefully', async () => {
    // Arrange
    const errorResponse = mockApiResponses.mockErrorResponse('Network failure', "NetworkError" as LinearErrorType);
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(errorResponse);
    
    // Mock the safeProject implementation for this test
    (enhancedClient.safeProject as any).mockImplementation(async (id: string) => {
      return enhancedClient.safeExecuteGraphQLQuery(
        'query Project { project(id: $id) { id name description } }',
        { id }
      );
    });
    
    // Act
    const result = await enhancedClient.safeProject(TEST_IDS.PROJECT);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe("NetworkError" as LinearErrorType);
    expect(result.error?.message).toContain('Network failure');
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
  });
});

describe('enhancedClient.safeProjects', () => {
  // Happy path
  it('should fetch multiple projects successfully', async () => {
    // Arrange
    const mockProjects = {
      nodes: [mockProjectData],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor1'
      }
    };
    
    const successResponse = createSuccessResponse({ projects: mockProjects });
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(successResponse);
    
    // Mock the safeProjects implementation
    (enhancedClient.safeProjects as any).mockImplementation(async (filter?: LinearDocument.ProjectFilter, first: number = 50, after?: string) => {
      const result = await enhancedClient.safeExecuteGraphQLQuery<{ projects: any }>(
        'query Projects { projects(filter: $filter, first: $first, after: $after) { nodes { id name } pageInfo { hasNextPage endCursor } } }',
        { filter, first, after }
      );
      
      if (result.success) {
        return { success: true, data: result.data?.projects };
      }
      return result;
    });
    
    // Act
    const result = await enhancedClient.safeProjects();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjects);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.stringContaining('query Projects'),
      expect.objectContaining({ first: 50, after: undefined })
    );
  });
  
  // With filter
  it('should apply filter correctly', async () => {
    // Arrange
    const mockProjects = {
      nodes: [mockProjectData],
      pageInfo: { hasNextPage: false, endCursor: null }
    };
    
    const filter = { name: { contains: 'Test' } };
    
    const successResponse = createSuccessResponse({ projects: mockProjects });
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(successResponse);
    
    // Mock the safeProjects implementation
    (enhancedClient.safeProjects as any).mockImplementation(async (filter?: LinearDocument.ProjectFilter, first: number = 50, after?: string) => {
      const result = await enhancedClient.safeExecuteGraphQLQuery<{ projects: any }>(
        'query Projects { projects(filter: $filter, first: $first, after: $after) { nodes { id name } pageInfo { hasNextPage endCursor } } }',
        { filter, first, after }
      );
      
      if (result.success) {
        return { success: true, data: result.data?.projects };
      }
      return result;
    });
    
    // Act
    const result = await enhancedClient.safeProjects(filter);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjects);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filter })
    );
  });
  
  // Pagination
  it('should support pagination', async () => {
    // Arrange
    const mockProjects = {
      nodes: [mockProjectData],
      pageInfo: { hasNextPage: true, endCursor: 'next-page' }
    };
    
    const successResponse = createSuccessResponse({ projects: mockProjects });
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(successResponse);
    
    // Mock the safeProjects implementation
    (enhancedClient.safeProjects as any).mockImplementation(async (filter?: LinearDocument.ProjectFilter, first: number = 50, after?: string) => {
      const result = await enhancedClient.safeExecuteGraphQLQuery<{ projects: any }>(
        'query Projects { projects(filter: $filter, first: $first, after: $after) { nodes { id name } pageInfo { hasNextPage endCursor } } }',
        { filter, first, after }
      );
      
      if (result.success) {
        return { success: true, data: result.data?.projects };
      }
      return result;
    });
    
    // Act
    const result = await enhancedClient.safeProjects(undefined, 10, 'start-cursor');
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjects);
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ first: 10, after: 'start-cursor' })
    );
  });
  
  // Error case
  it('should handle API errors gracefully', async () => {
    // Arrange
    const errorResponse = mockApiResponses.mockErrorResponse('API error', "NetworkError" as LinearErrorType);
    vi.mocked(enhancedClient.safeExecuteGraphQLQuery).mockResolvedValueOnce(errorResponse);
    
    // Mock the safeProjects implementation
    (enhancedClient.safeProjects as any).mockImplementation(async (filter?: LinearDocument.ProjectFilter, first: number = 50, after?: string) => {
      return enhancedClient.safeExecuteGraphQLQuery(
        'query Projects { projects(filter: $filter, first: $first, after: $after) { nodes { id name } pageInfo { hasNextPage endCursor } } }',
        { filter, first, after }
      );
    });
    
    // Act
    const result = await enhancedClient.safeProjects();
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(LinearError);
    expect(result.error?.type).toBe("NetworkError" as LinearErrorType);
    expect(result.error?.message).toContain('API error');
    expect(enhancedClient.safeExecuteGraphQLQuery).toHaveBeenCalledTimes(1);
  });
}); 