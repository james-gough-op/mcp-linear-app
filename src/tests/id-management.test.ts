import { describe, expect, it } from 'vitest';
import { LinearError, LinearErrorType } from '../libs/errors.js';
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
        '123e4567-e89b-42d3-a456-556642440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '550e8400-e29b-41d4-a716-446655440000'
      ];
      
      for (const id of validIds) {
        expect(LINEAR_ID_REGEX.test(id)).toBe(true);
      }
    });
    
    it('should not match invalid UUID formats', () => {
      // Invalid formats
      const invalidIds = [
        '', // empty
        'not-a-uuid',
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
      const validId = '123e4567-e89b-42d3-a456-556642440000';
      const validResult = LinearIdSchema.safeParse(validId);
      
      expect(validResult.success).toBe(true);
    });
    
    it('should reject invalid UUIDs', () => {
      // Invalid formats
      const invalidId = 'not-a-uuid';
      const invalidResult = LinearIdSchema.safeParse(invalidId);
      
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('ValidateLinearId Function', () => {
    it('should accept valid UUIDs', () => {
      // Valid UUID v4
      const validId = '123e4567-e89b-42d3-a456-556642440000';
      
      expect(() => {
        validateLinearId(validId, LinearEntityType.TEAM);
      }).not.toThrow();
    });
    
    it('should throw for invalid UUIDs', () => {
      // Invalid ID
      const invalidId = 'not-a-uuid';
      
      expect(() => {
        validateLinearId(invalidId, LinearEntityType.TEAM);
      }).toThrow(LinearError);
      
      try {
        validateLinearId(invalidId, LinearEntityType.TEAM);
      } catch (error) {
        expect(error instanceof LinearError).toBe(true);
        expect((error as LinearError).type).toBe(LinearErrorType.VALIDATION);
        expect((error as LinearError).message).toContain(LinearEntityType.TEAM);
      }
    });
  });

  describe('Specialized Validators', () => {
    it('should validate team IDs correctly', () => {
      // Valid UUID v4
      const validId = '123e4567-e89b-42d3-a456-556642440000';
      
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
        team: { id: '123e4567-e89b-42d3-a456-556642440000', entityType: LinearEntityType.TEAM },
        project: { id: 'not-a-uuid', entityType: LinearEntityType.PROJECT },
        issue: { id: '550e8400-e29b-41d4-a716-446655440000', entityType: LinearEntityType.ISSUE }
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
        teamId: '123e4567-e89b-42d3-a456-556642440000',
        title: 'Test issue',
        description: 'Test description',
        assigneeId: '550e8400-e29b-41d4-a716-446655440000',
        projectId: '123e4567-e89b-42d3-a456-556642440000',
      };
      
      const validResult = CreateIssueSchema.safeParse(validIssueData);
      expect(validResult.success).toBe(true);
    });
    
    it('should reject issue data with invalid IDs', () => {
      // Invalid issue creation data (invalid team ID)
      const invalidIssueData = {
        teamId: 'not-a-uuid',
        title: 'Test issue',
      };
      
      const invalidResult = CreateIssueSchema.safeParse(invalidIssueData);
      expect(invalidResult.success).toBe(false);
    });
  });
}); 