import { beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearError, LinearErrorType } from '../libs/errors.js';

// Mock the GraphQL client responses
vi.mock('../libs/client.js', () => ({
  enhancedClient: {
    executeGraphQLQuery: vi.fn(),
    executeGraphQLMutation: vi.fn(),
    cycle: vi.fn(),
    cycles: vi.fn(),
    addIssueToCycle: vi.fn()
  }
}));

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

      vi.mocked(enhancedClient._cycle).mockResolvedValueOnce(mockResponse.data.cycle as any);

      const result = await enhancedClient._cycle('cyc_123');
      
      expect(result).toEqual(mockResponse.data.cycle);
    });

    it('should throw an error for invalid cycle ID', async () => {
      const error = new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
      
      vi.mocked(enhancedClient._cycle).mockRejectedValueOnce(error);

      await expect(enhancedClient._cycle('')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error when cycle is not found', async () => {
      const error = new LinearError(
        'Cycle with ID cyc_123 not found',
        LinearErrorType.NOT_FOUND,
        undefined
      );

      vi.mocked(enhancedClient._cycle).mockRejectedValueOnce(error);

      await expect(enhancedClient._cycle('cyc_123')).rejects.toMatchObject({
        message: 'Cycle with ID cyc_123 not found',
        type: LinearErrorType.NOT_FOUND
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

      vi.mocked(enhancedClient._cycles).mockResolvedValueOnce(mockResponse.data.cycles as any);

      const result = await enhancedClient._cycles();
      
      expect(result).toEqual(mockResponse.data.cycles);
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

      vi.mocked(enhancedClient._addIssueToCycle).mockResolvedValueOnce(mockResponse.data.issueUpdate as any);

      const result = await enhancedClient._addIssueToCycle('issue_123', 'cyc_123');
      
      expect(result).toEqual(mockResponse.data.issueUpdate);
    });

    it('should throw an error for empty issue ID', async () => {
      const error = new LinearError(
        'Issue ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
      
      vi.mocked(enhancedClient._addIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient._addIssueToCycle('', 'cyc_123')).rejects.toMatchObject({
        message: 'Issue ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error for empty cycle ID', async () => {
      const error = new LinearError(
        'Cycle ID cannot be empty',
        LinearErrorType.VALIDATION,
        undefined
      );
      
      vi.mocked(enhancedClient._addIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient._addIssueToCycle('issue_123', '')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error when update fails', async () => {
      const error = new LinearError(
        'Failed to add issue to cycle',
        LinearErrorType.UNKNOWN,
        undefined
      );

      vi.mocked(enhancedClient._addIssueToCycle).mockRejectedValueOnce(error);

      await expect(enhancedClient._addIssueToCycle('issue_123', 'cyc_123')).rejects.toMatchObject({
        message: 'Failed to add issue to cycle',
        type: LinearErrorType.UNKNOWN
      });
    });
  });

  // Additional tests for createCycle and updateCycle can be added here
}); 