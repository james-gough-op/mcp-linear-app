import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { MOCK_IDS, createMockTeam } from './mocks/mock-data.js';

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
    const mockTeam = createMockTeam();
    mockSafeTeam.mockResolvedValue({ success: true, data: mockTeam });

    const result = await getEnhancedClient().safeTeam(MOCK_IDS.TEAM);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockTeam);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
    expect(mockSafeTeam).toHaveBeenCalledWith(MOCK_IDS.TEAM);
  });

  it('should return error result for invalid team ID', async () => {
    const invalidTeamId = 'invalid-id';
    const validationError = new LinearError(
      `Invalid team ID format: Linear IDs must be valid UUID v4 strings. Received: ${invalidTeamId}`, 
      "InvalidInput" as LinearErrorType
    );
    
    mockSafeTeam.mockResolvedValue({ 
      success: false, 
      error: validationError
    });

    const result = await getEnhancedClient().safeTeam(invalidTeamId);
    
    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error.type).toBe("InvalidInput" as LinearErrorType);
      expect(result.error.message).toBe(`Invalid team ID format: Linear IDs must be valid UUID v4 strings. Received: ${invalidTeamId}`);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
    expect(mockSafeExecuteGraphQLQuery).not.toHaveBeenCalled();
  });

  it('should return error result when team does not exist', async () => {
    const notFoundErrorMessage = `Team with ID ${MOCK_IDS.TEAM} not found`;
    const notFoundError = new LinearError(notFoundErrorMessage, "FeatureNotAccessible" as LinearErrorType);
    
    mockSafeTeam.mockResolvedValue({ 
      success: false, 
      error: notFoundError
    });
    
    const result = await getEnhancedClient().safeTeam(MOCK_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.message).toEqual(notFoundError.message);
      expect(result.error.type).toBe("FeatureNotAccessible" as LinearErrorType);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
  });
  
  it('should propagate API errors as error result', async () => {
    const apiError = new LinearError('API error', "NetworkError" as LinearErrorType);
    
    mockSafeTeam.mockResolvedValue({ 
      success: false, 
      error: apiError 
    });
    
    const result = await getEnhancedClient().safeTeam(MOCK_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.type).toBe("NetworkError" as LinearErrorType);
      expect(result.error.message).toEqual(apiError.message);
    }
    expect(mockSafeTeam).toHaveBeenCalledTimes(1);
  });
});

// Remove the redundant describe block for now, or update its tests similarly
// describe('enhancedClient.safeTeam (Result Pattern)', () => { ... }); 