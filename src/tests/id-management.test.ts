import { LinearErrorType } from '@linear/sdk';
import { describe, expect, it } from 'vitest';
import { LinearError } from '../libs/errors.js';
import {
    CreateIssueSchema,
    ID_PARAMETER_NAMES,
    LINEAR_ID_REGEX,
    LinearEntityType,
    LinearIdSchema,
    validateLinearId,
    validateLinearIds,
    validateTeamId
} from '../libs/id-management.js';
import { INVALID_IDS, TEST_IDS } from './utils/test-utils.js';

/**
 * Tests for Linear ID Management
 * 
 * These tests validate the ID management utilities for Linear entities
 */

describe('Linear ID Management', () => {
  describe('ID Regex Pattern', () => {
    it('should match valid UUID v4 formats', () => {
      // Valid UUID v4 formats
      const validIds = [
        TEST_IDS.TEAM,
        TEST_IDS.ISSUE,
        TEST_IDS.PROJECT
      ];
      
      for (const id of validIds) {
        expect(LINEAR_ID_REGEX.test(id)).toBe(true);
      }
    });
    
    it('should not match invalid UUID formats', () => {
      // Invalid formats
      const invalidIds = [
        '', // empty
        INVALID_IDS.TEAM,
        INVALID_IDS.ISSUE,
        INVALID_IDS.PROJECT,
        '123e4567-e89b-12d3-a456-556642440000', // not v4 (wrong middle digit)
        '123e4567-e89b-42d3-7456-556642440000', // not v4 (wrong variant)
        '123e4567-e89b-42d3-a456-55664244000Z' // not hex
      ];
      
      for (const id of invalidIds) {
        expect(LINEAR_ID_REGEX.test(id)).toBe(false);
      }
    });
  });

  describe('ID Schema Validation', () => {
    it('should validate correct UUIDs', () => {
      // Valid UUID v4
      const validId = TEST_IDS.TEAM;
      const validResult = LinearIdSchema.safeParse(validId);
      
      expect(validResult.success).toBe(true);
    });
    
    it('should reject invalid UUIDs', () => {
      // Invalid formats
      const invalidId = INVALID_IDS.TEAM;
      const invalidResult = LinearIdSchema.safeParse(invalidId);
      
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('ValidateLinearId Function', () => {
    it('should accept valid UUIDs', () => {
      // Valid UUID v4
      const validId = TEST_IDS.TEAM;
      
      expect(() => {
        validateLinearId(validId, LinearEntityType.TEAM);
      }).not.toThrow();
    });
    
    it('should throw for invalid UUIDs', () => {
      // Invalid ID
      const invalidId = INVALID_IDS.TEAM;
      
      expect(() => {
        validateLinearId(invalidId, LinearEntityType.TEAM);
      }).toThrow(LinearError);
      
      try {
        validateLinearId(invalidId, LinearEntityType.TEAM);
      } catch (error) {
        expect(error instanceof LinearError).toBe(true);
        expect((error as LinearError).type).toBe(LinearErrorType.InvalidInput);
        expect((error as LinearError).message).toContain(LinearEntityType.TEAM);
      }
    });
  });

  describe('Specialized Validators', () => {
    it('should validate team IDs correctly', () => {
      // Valid UUID v4
      const validId = TEST_IDS.TEAM;
      
      expect(() => {
        validateTeamId(validId);
      }).not.toThrow();
    });
    
    it('should map entity types to parameter names', () => {
      const teamParamName = ID_PARAMETER_NAMES[LinearEntityType.TEAM];
      expect(teamParamName).toBe('teamId');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple IDs and return errors for invalid ones', () => {
      // Mix of valid and invalid IDs
      const ids = {
        team: { id: TEST_IDS.TEAM, entityType: LinearEntityType.TEAM },
        project: { id: INVALID_IDS.PROJECT, entityType: LinearEntityType.PROJECT },
        issue: { id: TEST_IDS.ISSUE, entityType: LinearEntityType.ISSUE }
      };
      
      const errors = validateLinearIds(ids);
      
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain(LinearEntityType.PROJECT);
    });
  });

  describe('Schema Validation with Example Data', () => {
    it('should validate correct issue creation data', () => {
      // Valid issue creation data
      const validIssueData = {
        teamId: TEST_IDS.TEAM,
        title: 'Test issue',
        description: 'Test description',
        assigneeId: '11112222-3333-4444-a555-666677778888', // Valid UUID for user
        projectId: TEST_IDS.PROJECT,
      };
      
      const validResult = CreateIssueSchema.safeParse(validIssueData);
      
      if (!validResult.success) {
        // Log detailed error information for debugging
        console.error('Validation errors:', JSON.stringify(validResult.error.format(), null, 2));
      }
      
      expect(validResult.success).toBe(true);
    });
    
    it('should reject issue data with invalid IDs', () => {
      // Invalid issue creation data (invalid team ID)
      const invalidIssueData = {
        teamId: INVALID_IDS.TEAM,
        title: 'Test issue',
      };
      
      const invalidResult = CreateIssueSchema.safeParse(invalidIssueData);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        // Verify we got the expected error for the team ID
        const errors = invalidResult.error.format();
        expect(errors.teamId?._errors).toBeDefined();
        expect(errors.teamId?._errors.length).toBeGreaterThan(0);
        expect(errors.teamId?._errors[0]).toContain('Invalid Linear ID format');
      }
    });
  });
}); 