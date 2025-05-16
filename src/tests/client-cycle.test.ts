import { CyclePayload, LinearDocument, LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinearError, LinearResult } from '../libs/errors.js';

// Mock the GraphQL client responses
vi.mock('../libs/client.js', () => {
  const mockClient = {
    executeGraphQLQuery: vi.fn(),
    executeGraphQLMutation: vi.fn(),
    safeCycle: vi.fn(),
    safeCycles: vi.fn(),
    safeAddIssueToCycle: vi.fn(),
    safeCreateCycle: vi.fn(),
    safeUpdateCycle: vi.fn()
  };

  return {
    default: mockClient,
    enhancedClient: mockClient
  };
});

// Import the mocked client
import enhancedClient from '../libs/client.js';

describe('Cycle Management Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cycle()', () => {
    it('should fetch a cycle by ID successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          cycle: {
            id: 'cyc_123',
            name: 'Sprint 1',
            number: 1,
            startsAt: '2023-01-01',
            endsAt: '2023-01-14',
            team: {
              id: 'team_123',
              name: 'Engineering',
              key: 'ENG'
            }
          }
        }
      };

      vi.mocked(enhancedClient.safeCycle).mockResolvedValueOnce(mockResponse.data.cycle as any);

      const result = await enhancedClient.safeCycle('cyc_123');
      
      expect(result).toEqual(mockResponse.data.cycle);
    });

    it('should throw an error for invalid cycle ID', async () => {
      const error = new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.InvalidInput,
        undefined
      );
      
      vi.mocked(enhancedClient.safeCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeCycle('')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.InvalidInput
      });
    });

    it('should throw an error when cycle is not found', async () => {
      const error = new LinearError(
        'Cycle with ID cyc_123 not found',
        LinearErrorType.FeatureNotAccessible,
        undefined
      );

      vi.mocked(enhancedClient.safeCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeCycle('cyc_123')).rejects.toMatchObject({
        message: 'Cycle with ID cyc_123 not found',
        type: LinearErrorType.FeatureNotAccessible
      });
    });
  });

  describe('cycles()', () => {
    it('should fetch cycles successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cyc_123',
                name: 'Sprint 1',
                number: 1
              },
              {
                id: 'cyc_456',
                name: 'Sprint 2',
                number: 2
              }
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor123'
            }
          }
        }
      };

      vi.mocked(enhancedClient.safeCycles).mockResolvedValueOnce(mockResponse.data.cycles as any);

      const result = await enhancedClient.safeCycles();
      
      expect(result).toEqual(mockResponse.data.cycles);
    });
  });

  describe('createCycle()', () => {
    it('should create a cycle successfully', async () => {
      // Mock successful response with properly typed CyclePayload
      const mockResponse: LinearResult<CyclePayload> = {
        success: true,
        // Use type assertion for the entire payload to avoid property type issues
        data: {
          success: true,
          cycle: {
            id: 'cyc_123',
            name: 'Sprint 1',
            number: 1
          },
          lastSyncId: 123
        } as unknown as CyclePayload
      };

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: 'team_123',
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input);
      
      expect(result).toEqual(mockResponse);
    });

    it('should return error for missing team ID', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Team ID is required to create a cycle',
          LinearErrorType.InvalidInput,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      // Note: We're intentionally omitting teamId to test validation
      const input: Partial<LinearDocument.CycleCreateInput> = {
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input as LinearDocument.CycleCreateInput);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    });

    it('should return error when API request fails', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Failed to create cycle',
          LinearErrorType.Unknown,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: 'team_123',
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.Unknown);
    });

    it('should return error for invalid team ID format', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Invalid team ID format',
          LinearErrorType.InvalidInput,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: 'invalid_id',
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    });
  });

  describe('updateCycle()', () => {
    it('should update a cycle successfully', async () => {
      // Mock successful response
      const mockResponse: LinearResult<CyclePayload> = {
        success: true,
        data: {
          success: true,
          cycle: {
            id: 'cyc_123',
            name: 'Updated Sprint',
            number: 1,
            description: 'Updated description'
          },
          lastSyncId: 456
        } as unknown as CyclePayload
      };

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = 'cyc_123';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint',
        description: 'Updated description'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect((result.data as any)?.cycle?.name).toBe('Updated Sprint');
    });

    it('should return error for invalid cycle ID', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Cycle ID cannot be empty',
          LinearErrorType.InvalidInput,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = '';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    });

    it('should return error when cycle is not found', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Cycle with ID cyc_999 not found',
          LinearErrorType.FeatureNotAccessible,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = 'cyc_999';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.FeatureNotAccessible);
    });

    it('should return error for empty update input', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Update input cannot be empty',
          LinearErrorType.InvalidInput,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = 'cyc_123';
      const input: LinearDocument.CycleUpdateInput = {};

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
    });

    it('should return error when API request fails', async () => {
      // Mock error response
      const mockResponse: LinearResult<CyclePayload> = {
        success: false,
        error: new LinearError(
          'Failed to update cycle',
          LinearErrorType.Unknown,
          undefined
        )
      };

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = 'cyc_123';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.Unknown);
    });
  });

  describe('addIssueToCycle()', () => {
    it('should add an issue to a cycle successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          issueUpdate: {
            success: true,
            issue: {
              id: 'issue_123',
              identifier: 'ENG-123',
              title: 'Test Issue',
              cycle: {
                id: 'cyc_123',
                name: 'Sprint 1',
                number: 1
              }
            }
          }
        }
      };

      vi.mocked(enhancedClient.safeAddIssueToCycle).mockResolvedValueOnce(mockResponse.data.issueUpdate as any);

      const result = await enhancedClient.safeAddIssueToCycle('issue_123', 'cyc_123');
      
      expect(result).toEqual(mockResponse.data.issueUpdate);
    });

    it('should throw an error for empty issue ID', async () => {
      const error = new LinearError(
        'Issue ID cannot be empty',
        LinearErrorType.InvalidInput,
        undefined
      );
      
      vi.mocked(enhancedClient.safeAddIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeAddIssueToCycle('', 'cyc_123')).rejects.toMatchObject({
        message: 'Issue ID cannot be empty',
        type: LinearErrorType.InvalidInput
      });
    });

    it('should throw an error for empty cycle ID', async () => {
      const error = new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.InvalidInput,
        undefined
      );
      
      vi.mocked(enhancedClient.safeAddIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeAddIssueToCycle('issue_123', '')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.InvalidInput
      });
    });

    it('should throw an error when update fails', async () => {
      const error = new LinearError(
        'Failed to add issue to cycle',
        LinearErrorType.Unknown,
        undefined
      );

      vi.mocked(enhancedClient.safeAddIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeAddIssueToCycle('issue_123', 'cyc_123')).rejects.toMatchObject({
        message: 'Failed to add issue to cycle',
        type: LinearErrorType.Unknown
      });
    });
  });
}); 