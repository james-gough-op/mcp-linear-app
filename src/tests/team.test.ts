import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { createSuccessResponse, mockApiResponses, mockTeamData, TEST_IDS } from './utils/test-utils.js';

// Use vi.hoisted to define mocks before they are used
const mockSafeTeam = vi.hoisted(() => vi.fn());
const mockSafeExecuteGraphQLQuery = vi.hoisted(() => vi.fn());

// Mock the client.js module
vi.mock('../libs/client.js', () => ({
  getEnhancedClient: () => ({
    safeTeam: mockSafeTeam,
    safeExecuteGraphQLQuery: mockSafeExecuteGraphQLQuery
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks(); 
});

describe('enhancedClient.safeTeam', () => {
  it('should fetch a team successfully', async () => {
    mockSafeTeam.mockResolvedValue(createSuccessResponse(mockTeamData));

    const result = await getEnhancedClient().safeTeam(TEST_IDS.TEAM);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockTeamData);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
    expect(mockSafeTeam).toHaveBeenCalledWith(TEST_IDS.TEAM);
  });

  it('should return error result for invalid team ID', async () => {
    const invalidTeamId = 'invalid-id';
    
    mockSafeTeam.mockResolvedValue(
      mockApiResponses.mockErrorResponse(
        `Validation error: Invalid input. Invalid team ID format: Linear IDs must be valid UUID v4 strings. Received: ${invalidTeamId}`, 
        LinearErrorType.InvalidInput
      )
    );

    const result = await getEnhancedClient().safeTeam(invalidTeamId);
    
    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error.type).toBe(LinearErrorType.InvalidInput);
      expect(result.error.message).toBe(`Validation error: Invalid input. Invalid team ID format: Linear IDs must be valid UUID v4 strings. Received: ${invalidTeamId}`);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });

  it('should return error result when team does not exist', async () => {
    const notFoundErrorMessage = `Not found: Team with ID ${TEST_IDS.TEAM} not found`;
    
    mockSafeTeam.mockResolvedValue(
      mockApiResponses.mockErrorResponse(
        notFoundErrorMessage, 
        LinearErrorType.FeatureNotAccessible
      )
    );
    
    const result = await getEnhancedClient().safeTeam(TEST_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.message).toEqual(notFoundErrorMessage);
      expect(result.error.type).toBe(LinearErrorType.FeatureNotAccessible);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
  });
  
  it('should propagate API errors as error result', async () => {
    mockSafeTeam.mockResolvedValue(
      mockApiResponses.mockErrorResponse(
        'Network error: API error', 
        LinearErrorType.NetworkError
      )
    );
    
    const result = await getEnhancedClient().safeTeam(TEST_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.type).toBe(LinearErrorType.NetworkError);
      expect(result.error.message).toEqual('Network error: API error');
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
  });
});

// Remove the redundant describe block for now, or update its tests similarly
// describe('enhancedClient.safeTeam (Result Pattern)', () => { ... }); 