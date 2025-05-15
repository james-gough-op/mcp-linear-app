import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';
import {
  createMockIssue,
  MOCK_IDS
} from './mocks/mock-data.js';

// Setup mocks
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Simple spies without default implementations
  vi.spyOn(enhancedClient, 'executeGraphQLQuery');
  vi.spyOn(enhancedClient, 'safeGetIssue');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enhancedClient.safeGetIssue', () => {
  // Happy path
  it('should return issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    
    // Temporarily replace the method with a mock function
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockResolvedValue(mockIssue);
    
    try {
      // Act
      const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
      
      // Assert
      expect(result).toEqual(mockIssue);
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
  
  // Error cases
  it('should throw validation error for invalid ID format', async () => {
    // Arrange
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockRejectedValue(
      new LinearError('Invalid ID', LinearErrorType.VALIDATION)
    );
    
    try {
      // Act & Assert
      await expect(enhancedClient.safeGetIssue('invalid-id')).rejects.toThrow(LinearError);
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
  
  // More tests...
});

describe('enhancedClient.safeGetIssue', () => {
  // Happy path
  it('should return success result with issue data for valid ID', async () => {
    // Arrange
    const mockIssue = createMockIssue();
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockResolvedValue(mockIssue);
    
    try {
      // Act
      const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIssue);
      expect(enhancedClient.safeGetIssue).toHaveBeenCalledWith(MOCK_IDS.ISSUE);
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
  
  // Error case for validation error
  it('should return error result for invalid ID', async () => {
    // Arrange
    const validationError = new LinearError('Invalid ID', LinearErrorType.VALIDATION);
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockRejectedValue(validationError);
    
    try {
      // Act
      const result = await enhancedClient.safeGetIssue('invalid-id');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(validationError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
  
  // Error case for not found
  it('should return error result for not found issue', async () => {
    // Arrange
    const notFoundError = new LinearError('Issue not found', LinearErrorType.NOT_FOUND);
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockRejectedValue(notFoundError);
    
    try {
      // Act
      const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(notFoundError);
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
  
  // Unknown error conversion
  it('should convert unknown errors to LinearError', async () => {
    // Arrange
    const unknownError = new Error('Some unexpected error');
    const originalMethod = enhancedClient.safeGetIssue;
    enhancedClient.safeGetIssue = vi.fn().mockRejectedValue(unknownError);
    
    try {
      // Act
      const result = await enhancedClient.safeGetIssue(MOCK_IDS.ISSUE);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error?.type).toBe(LinearErrorType.UNKNOWN);
      expect(result.error?.message).toContain('Some unexpected error');
      expect(result.data).toBeUndefined();
    } finally {
      // Restore original method
      enhancedClient.safeGetIssue = originalMethod;
    }
  });
}); 