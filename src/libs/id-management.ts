/**
 * Linear ID Management
 * 
 * This module provides utilities for working with Linear entity IDs.
 * Linear uses UUIDs (v4) for all entity identifiers.
 */

import { LinearErrorType } from '@linear/sdk';
import { z } from 'zod';
import { LinearError } from './errors.js';

/**
 * Regular expression for validating UUID v4 format
 * Linear entity IDs follow this format
 */
export const LINEAR_ID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i;

/**
 * Zod schema for validating Linear entity IDs
 */
export const LinearIdSchema = z.string().regex(LINEAR_ID_REGEX, {
  message: "Invalid Linear ID format. Linear IDs must be valid UUID v4 strings."
});

/**
 * Enumeration of Linear entity types for consistent naming
 */
export enum LinearEntityType {
  TEAM = 'team',
  PROJECT = 'project',
  ISSUE = 'issue',
  CYCLE = 'cycle',
  LABEL = 'label',
  COMMENT = 'comment',
  USER = 'user',
  TEMPLATE = 'template',
  ROADMAP = 'roadmap',
  MILESTONE = 'milestone',
  WORKFLOW_STATE = 'workflowState'
}

/**
 * Maps entity types to their parameter naming conventions
 */
export const ID_PARAMETER_NAMES: Record<LinearEntityType, string> = {
  [LinearEntityType.TEAM]: 'teamId',
  [LinearEntityType.PROJECT]: 'projectId',
  [LinearEntityType.ISSUE]: 'issueId',
  [LinearEntityType.CYCLE]: 'cycleId',
  [LinearEntityType.LABEL]: 'labelId',
  [LinearEntityType.COMMENT]: 'commentId',
  [LinearEntityType.USER]: 'userId',
  [LinearEntityType.TEMPLATE]: 'templateId',
  [LinearEntityType.ROADMAP]: 'roadmapId',
  [LinearEntityType.MILESTONE]: 'milestoneId',
  [LinearEntityType.WORKFLOW_STATE]: 'workflowStateId'
};

/**
 * Interface for representing Linear entity IDs in a typed manner
 */
export interface LinearId {
  id: string;
  entityType: LinearEntityType;
}

/**
 * Validates a Linear entity ID
 * Throws a custom LinearError if validation fails
 * 
 * @param id The ID to validate
 * @param entityType The type of entity this ID represents (for better error messages)
 * @throws {LinearError} When ID validation fails
 */
export function validateLinearId(id: string, entityType: LinearEntityType): void {
  if (typeof id !== 'string' || id.trim() === '') { // Basic check for non-empty string
    throw new LinearError(
      `Invalid ${entityType} ID: Must be a non-empty string. Received: ${id}`,
      "InvalidInput" as LinearErrorType
    );
  }
  if (!LINEAR_ID_REGEX.test(id)) { // Direct regex test
    throw new LinearError(
      `Invalid ${entityType} ID format: Linear IDs must be valid UUID v4 strings. Received: ${id}`,
      "InvalidInput" as LinearErrorType,
      new z.ZodError([{ // Mimic ZodError structure for consistency if other code expects it
        path: [],
        message: "Invalid Linear ID format. Linear IDs must be valid UUID v4 strings.",
        code: z.ZodIssueCode.invalid_string,
        validation: "regex",
      }])
    );
  }
  // If we reach here, the ID is considered valid by the direct regex test.
  // No Zod parse for regex needed if LINEAR_ID_REGEX.test is reliable here.
}

/**
 * Validates multiple Linear entity IDs at once
 * Returns an array of validation errors if any exist
 * 
 * @param ids Object containing IDs to validate with their entity types
 * @returns Array of error messages (empty if all IDs are valid)
 */
export function validateLinearIds(ids: Record<string, { id: string; entityType: LinearEntityType }>): string[] {
  const errors: string[] = [];
  
  for (const [paramName, { id, entityType }] of Object.entries(ids)) {
    try {
      validateLinearId(id, entityType);
    } catch (error) {
      if (error instanceof LinearError) {
        errors.push(error.message);
      } else {
        errors.push(`Invalid ${paramName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  return errors;
}

/**
 * Creates a validation function for a specific entity type
 * Useful for creating specialized validators
 * 
 * @param entityType The type of entity to validate
 * @returns A validation function for the specified entity type
 */
export function createEntityValidator(entityType: LinearEntityType): (id: string) => void {
  return (id: string) => validateLinearId(id, entityType);
}

// Specialized validators for common entity types
export const validateTeamId = createEntityValidator(LinearEntityType.TEAM);
export const validateProjectId = createEntityValidator(LinearEntityType.PROJECT);
export const validateIssueId = createEntityValidator(LinearEntityType.ISSUE);
export const validateCycleId = createEntityValidator(LinearEntityType.CYCLE);
export const validateLabelId = createEntityValidator(LinearEntityType.LABEL);
export const validateTemplateId = createEntityValidator(LinearEntityType.TEMPLATE);

/**
 * Creates a typed Zod schema for a specific entity type
 * Useful for validating request bodies or parameters
 * 
 * @param entityType The type of entity
 * @param required Whether the ID is required or optional
 * @returns A Zod schema for the specified entity type
 */
export function createEntitySchema(entityType: LinearEntityType, required: boolean = true): z.ZodSchema<string | undefined> {
  const schema = LinearIdSchema
    .describe(`${entityType} ID (UUID v4 format)`);
  
  return required ? schema : schema.optional();
}

/**
 * Example schema for a request that requires a team ID
 */
export const TeamOperationSchema = z.object({
  teamId: createEntitySchema(LinearEntityType.TEAM),
  // Other fields as needed
});

/**
 * Example schema for creating an issue
 */
export const CreateIssueSchema = z.object({
  teamId: createEntitySchema(LinearEntityType.TEAM),
  title: z.string().min(1, "Issue title is required"),
  description: z.string().optional(),
  assigneeId: createEntitySchema(LinearEntityType.USER, false),
  labelIds: z.array(createEntitySchema(LinearEntityType.LABEL)).optional(),
  cycleId: createEntitySchema(LinearEntityType.CYCLE, false),
  projectId: createEntitySchema(LinearEntityType.PROJECT, false)
});

/**
 * Validates that the Linear API key is present and has the correct format.
 * Linear API keys typically start with "lin_api_" followed by a string of alphanumeric characters.
 */
export function validateApiKey(apiKey: string | undefined): { valid: boolean; message?: string } {
  if (!apiKey) {
    return { 
      valid: false, 
      message: 'LINEAR_API_KEY environment variable is not set. Please add it to your .env file.' 
    };
  }

  const linearKeyPattern = /^lin_api_[a-zA-Z0-9]+$/;
  if (!linearKeyPattern.test(apiKey)) {
    return { 
      valid: false, 
      message: 'LINEAR_API_KEY has an invalid format. Linear API keys should start with "lin_api_" followed by alphanumeric characters.' 
    };
  }
  return { valid: true };
} 