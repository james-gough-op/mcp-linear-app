import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientLib from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { MOCK_IDS, createMockTeam } from './mocks/mock-data.js';

beforeEach(() => {
  vi.clearAllMocks();
  // We will spy directly in tests that need to observe calls to safeExecuteGraphQLQuery
});

afterEach(() => {
  vi.restoreAllMocks(); 
});

describe('enhancedClient.safeTeam', () => {
  it('should fetch a team successfully', async () => {
    const mockTeam = createMockTeam();
    const spy = vi.spyOn(clientLib.enhancedClient, 'safeExecuteGraphQLQuery')
                  .mockResolvedValueOnce({ success: true, data: { team: mockTeam } });

    const result = await clientLib.enhancedClient.safeTeam(MOCK_IDS.TEAM);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockTeam);
    }
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('query GetTeam'), 
      { teamId: MOCK_IDS.TEAM }
    );
    spy.mockRestore();
  });

  it('should return error result for invalid team ID', async () => {
    const invalidTeamId = 'invalid-id';
    const safeExecuteSpy = vi.spyOn(clientLib.enhancedClient, 'safeExecuteGraphQLQuery');

    const result = await clientLib.enhancedClient.safeTeam(invalidTeamId);
    
    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toBeInstanceOf(LinearError);
      expect(result.error.type).toBe("InvalidInput" as LinearErrorType);
      expect(result.error.message).toBe(`Invalid team ID format: Linear IDs must be valid UUID v4 strings. Received: ${invalidTeamId}`);
    }
    expect(safeExecuteSpy).not.toHaveBeenCalled();
    safeExecuteSpy.mockRestore();
  });

  it('should return error result when team does not exist', async () => {
    const notFoundErrorMessage = `Team with ID ${MOCK_IDS.TEAM} not found`;
    const anError = new LinearError(notFoundErrorMessage, "FeatureNotAccessible" as LinearErrorType);
    const spy = vi.spyOn(clientLib.enhancedClient, 'safeExecuteGraphQLQuery').mockResolvedValueOnce({ 
        success: false, error: anError 
    });
    
    const result = await clientLib.enhancedClient.safeTeam(MOCK_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
        expect(result.error.message).toEqual(anError.message);
        expect(result.error.type).toBe("FeatureNotAccessible" as LinearErrorType);
    }
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  
  it('should propagate API errors as error result', async () => {
    const apiError = new LinearError('API error', "NetworkError" as LinearErrorType);
    const spy = vi.spyOn(clientLib.enhancedClient, 'safeExecuteGraphQLQuery').mockResolvedValueOnce({ 
        success: false, error: apiError 
    });
    
    const result = await clientLib.enhancedClient.safeTeam(MOCK_IDS.TEAM);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      // _team re-throws the error from safeExecuteGraphQLQuery. 
      // If that error IS a LinearError, its type and message should be preserved.
      expect(result.error.type).toBe("NetworkError" as LinearErrorType);
      expect(result.error.message).toEqual(apiError.message);
    }
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

// Remove the redundant describe block for now, or update its tests similarly
// describe('enhancedClient.safeTeam (Result Pattern)', () => { ... }); 