import { beforeEach, describe, expect, it, vi } from 'vitest';
import enhancedClient from '../libs/client.js';
import { LinearErrorType, LinearResult } from '../libs/errors.js';

// Mock the GraphQL client responses
vi.mock('../libs/client.js', () => ({
  enhancedClient: {
    executeGraphQLQuery: vi.fn(),
    executeGraphQLMutation: vi.fn()
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

      vi.mocked(enhancedClient.executeGraphQLQuery).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);

      const result = await enhancedClient.safeCycle('cyc_123');
      
      expect(result).toEqual(mockResponse.data.cycle);
      expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
        expect.stringContaining('query GetCycle'),
        { id: 'cyc_123' }
      );
    });

    it('should throw an error for invalid cycle ID', async () => {
      await expect(enhancedClient.safeCycle('')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error when cycle is not found', async () => {
      // Mock not found response
      const mockResponse = {
        data: {
          cycle: null
        }
      };

      vi.mocked(enhancedClient.executeGraphQLQuery).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);

      await expect(enhancedClient.safeCycle('cyc_123')).rejects.toMatchObject({
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

      vi.mocked(enhancedClient.executeGraphQLQuery).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);

      const result = await enhancedClient.safeCycles();
      
      expect(result).toEqual(mockResponse.data.cycles);
      expect(enhancedClient.executeGraphQLQuery).toHaveBeenCalledWith(
        expect.stringContaining('query GetCycles'),
        { filter: undefined, first: 50, after: undefined, includeArchived: false }
      );
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

      vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);

      const result = await enhancedClient.safeAddIssueToCycle('issue_123', 'cyc_123');
      
      expect(result).toEqual(mockResponse.data.issueUpdate);
      expect(enhancedClient.safeExecuteGraphQLMutation).toHaveBeenCalledWith(
        expect.stringContaining('mutation AddIssueToCycle'),
        { issueId: 'issue_123', cycleId: 'cyc_123' }
      );
    });

    it('should throw an error for empty issue ID', async () => {
      await expect(enhancedClient.safeAddIssueToCycle('', 'cyc_123')).rejects.toMatchObject({
        message: 'Issue ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error for empty cycle ID', async () => {
      await expect(enhancedClient.safeAddIssueToCycle('issue_123', '')).rejects.toMatchObject({
        message: 'Cycle ID cannot be empty',
        type: LinearErrorType.VALIDATION
      });
    });

    it('should throw an error when update fails', async () => {
      // Mock failed response
      const mockResponse = {
        data: {
          issueUpdate: null
        }
      };

      vi.mocked(enhancedClient.safeExecuteGraphQLMutation).mockResolvedValueOnce(mockResponse as LinearResult<unknown>);

      await expect(enhancedClient.safeAddIssueToCycle('issue_123', 'cyc_123')).rejects.toMatchObject({
        message: 'Failed to add issue to cycle',
        type: LinearErrorType.UNKNOWN
      });
    });
  });

  // Additional tests for createCycle and updateCycle can be added here
}); 