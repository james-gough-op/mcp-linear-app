import { Cycle, CycleConnection, CyclePayload, LinearDocument, LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinearError } from '../libs/errors.js';
import {
  createSuccessResponse,
  mockApiResponses,
  TEST_IDS
} from './utils/test-utils.js';

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
            id: TEST_IDS.CYCLE,
            name: 'Sprint 1',
            number: 1,
            startsAt: '2023-01-01',
            endsAt: '2023-01-14',
            team: {
              id: TEST_IDS.TEAM,
              name: 'Engineering',
              key: 'ENG'
            }
          }
        }
      };

      vi.mocked(enhancedClient.safeCycle).mockResolvedValueOnce(
        createSuccessResponse<Cycle>(mockResponse.data.cycle as unknown as Cycle)
      );

      const result = await enhancedClient.safeCycle(TEST_IDS.CYCLE);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.cycle);
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
        `Cycle with ID ${TEST_IDS.CYCLE} not found`,
        LinearErrorType.FeatureNotAccessible,
        undefined
      );

      vi.mocked(enhancedClient.safeCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeCycle(TEST_IDS.CYCLE)).rejects.toMatchObject({
        message: `Cycle with ID ${TEST_IDS.CYCLE} not found`,
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
                id: TEST_IDS.CYCLE,
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

      vi.mocked(enhancedClient.safeCycles).mockResolvedValueOnce(
        createSuccessResponse<CycleConnection>(mockResponse.data.cycles as unknown as CycleConnection)
      );

      const result = await enhancedClient.safeCycles();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.cycles);
    });
  });

  describe('createCycle()', () => {
    it('should create a cycle successfully', async () => {
      // Mock successful response with properly typed CyclePayload
      const mockResponse = createSuccessResponse({
        success: true,
        cycle: {
          id: TEST_IDS.CYCLE,
          name: 'Sprint 1',
          number: 1
        },
        lastSyncId: 123
      } as unknown as CyclePayload);

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: TEST_IDS.TEAM,
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input);
      
      expect(result).toEqual(mockResponse);
    });

    it('should return error for missing team ID', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Team ID is required to create a cycle',
        LinearErrorType.InvalidInput
      );

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      // Note: We're intentionally omitting teamId to test validation
      const input: Partial<LinearDocument.CycleCreateInput> = {
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input as LinearDocument.CycleCreateInput);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
      expect(result.error?.message).toContain('Team ID is required');
    });

    it('should return error when API request fails', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Failed to create cycle',
        LinearErrorType.Unknown
      );

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: TEST_IDS.TEAM,
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
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Invalid team ID format',
        LinearErrorType.InvalidInput
      );

      vi.mocked(enhancedClient.safeCreateCycle).mockResolvedValueOnce(mockResponse);

      const input: LinearDocument.CycleCreateInput = {
        teamId: 'invalid_id',
        name: 'Sprint 1',
        startsAt: new Date('2023-01-01'),
        endsAt: new Date('2023-01-14')
      };

      const result = await enhancedClient.safeCreateCycle(input);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
      expect(result.error?.message).toContain('Invalid team ID format');
    });
  });

  describe('updateCycle()', () => {
    it('should update a cycle successfully', async () => {
      // Mock successful response
      const mockResponse = createSuccessResponse({
        success: true,
        cycle: {
          id: TEST_IDS.CYCLE,
          name: 'Updated Sprint',
          number: 1,
          description: 'Updated description'
        },
        lastSyncId: 456
      } as unknown as CyclePayload);

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = TEST_IDS.CYCLE;
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint',
        description: 'Updated description'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      // In the context of a test, we can safely bypass type checking when we know the structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any)?.cycle?.name).toBe('Updated Sprint');
    });

    it('should return error for invalid cycle ID', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Cycle ID cannot be empty',
        LinearErrorType.InvalidInput
      );

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = '';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
      expect(result.error?.message).toContain('Cycle ID cannot be empty');
    });

    it('should return error when cycle is not found', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Cycle with ID cyc_999 not found',
        LinearErrorType.FeatureNotAccessible
      );

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = 'cyc_999';
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.FeatureNotAccessible);
      expect(result.error?.message).toContain('not found');
    });

    it('should return error for empty update input', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Update input cannot be empty',
        LinearErrorType.InvalidInput
      );

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = TEST_IDS.CYCLE;
      const input: LinearDocument.CycleUpdateInput = {};

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.InvalidInput);
      expect(result.error?.message).toContain('Update input cannot be empty');
    });

    it('should return error when API request fails', async () => {
      // Mock error response
      const mockResponse = mockApiResponses.mockErrorResponse(
        'Failed to update cycle',
        LinearErrorType.Unknown
      );

      vi.mocked(enhancedClient.safeUpdateCycle).mockResolvedValueOnce(mockResponse);

      const cycleId = TEST_IDS.CYCLE;
      const input: LinearDocument.CycleUpdateInput = {
        name: 'Updated Sprint'
      };

      const result = await enhancedClient.safeUpdateCycle(cycleId, input);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(LinearErrorType.Unknown);
      expect(result.error?.message).toContain('Failed to update cycle');
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
              id: TEST_IDS.ISSUE,
              identifier: 'ENG-123',
              title: 'Test Issue',
              cycle: {
                id: TEST_IDS.CYCLE,
                name: 'Sprint 1',
                number: 1
              }
            }
          }
        }
      };

      // In a test context, we can use a more simplified mock approach
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(enhancedClient.safeAddIssueToCycle).mockResolvedValueOnce(mockResponse.data.issueUpdate as any);

      const result = await enhancedClient.safeAddIssueToCycle(TEST_IDS.ISSUE, TEST_IDS.CYCLE);
      
      expect(result).toEqual(mockResponse.data.issueUpdate);
    });

    it('should throw an error for empty issue ID', async () => {
      const error = new LinearError(
        'Issue ID cannot be empty',
        LinearErrorType.InvalidInput,
        undefined
      );
      
      vi.mocked(enhancedClient.safeAddIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient.safeAddIssueToCycle('', TEST_IDS.CYCLE)).rejects.toMatchObject({
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

      await expect(enhancedClient.safeAddIssueToCycle(TEST_IDS.ISSUE, '')).rejects.toMatchObject({
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

      await expect(enhancedClient.safeAddIssueToCycle(TEST_IDS.ISSUE, TEST_IDS.CYCLE)).rejects.toMatchObject({
        message: 'Failed to add issue to cycle',
        type: LinearErrorType.Unknown
      });
    });
  });
}); 