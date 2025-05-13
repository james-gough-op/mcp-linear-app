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

// Test regex pattern on different ID formats
function testIdRegexPattern() {
  console.log('Testing ID regex pattern...');
  
  // Valid UUID v4 formats
  const validIds = [
    '123e4567-e89b-42d3-a456-556642440000',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '550e8400-e29b-41d4-a716-446655440000'
  ];
  
  for (const id of validIds) {
    if (!LINEAR_ID_REGEX.test(id)) {
      console.error(`Valid UUID v4 ${id} did not match the regex pattern`);
      return false;
    }
  }
  
  // Invalid formats
  const invalidIds = [
    '', // empty
    'not-a-uuid',
    '123e4567-e89b-12d3-a456-556642440000', // not v4 (wrong middle digit)
    '123e4567-e89b-42d3-7456-556642440000', // not v4 (wrong variant)
    '123e4567-e89b-42d3-a456-55664244000Z' // not hex
  ];
  
  for (const id of invalidIds) {
    if (LINEAR_ID_REGEX.test(id)) {
      console.error(`Invalid UUID ${id} incorrectly matched the regex pattern`);
      return false;
    }
  }
  
  console.log('ID regex pattern tests passed ✅');
  return true;
}

// Test Zod schema validation
function testIdSchemaValidation() {
  console.log('Testing ID schema validation...');
  
  // Valid UUID v4
  const validId = '123e4567-e89b-42d3-a456-556642440000';
  const validResult = LinearIdSchema.safeParse(validId);
  
  if (!validResult.success) {
    console.error(`Valid UUID v4 ${validId} did not pass schema validation`);
    return false;
  }
  
  // Invalid formats
  const invalidId = 'not-a-uuid';
  const invalidResult = LinearIdSchema.safeParse(invalidId);
  
  if (invalidResult.success) {
    console.error(`Invalid UUID ${invalidId} incorrectly passed schema validation`);
    return false;
  }
  
  console.log('ID schema validation tests passed ✅');
  return true;
}

// Test validateLinearId function
function testValidateFunction() {
  console.log('Testing validateLinearId function...');
  
  // Valid UUID v4
  const validId = '123e4567-e89b-42d3-a456-556642440000';
  
  try {
    validateLinearId(validId, LinearEntityType.TEAM);
    // No exception means validation passed
  } catch (error) {
    console.error(`Valid UUID v4 ${validId} failed validation:`, error);
    return false;
  }
  
  // Invalid ID
  const invalidId = 'not-a-uuid';
  
  try {
    validateLinearId(invalidId, LinearEntityType.TEAM);
    console.error(`Invalid UUID ${invalidId} incorrectly passed validation`);
    return false;
  } catch (error) {
    // Expected to fail
    if (!(error instanceof LinearError) || error.type !== LinearErrorType.VALIDATION) {
      console.error('Expected LinearError with VALIDATION type but got:', error);
      return false;
    }
    
    // Ensure message contains entity type for better error context
    if (!error.message.includes(LinearEntityType.TEAM)) {
      console.error('Error message should include entity type, got:', error.message);
      return false;
    }
  }
  
  console.log('validateLinearId function tests passed ✅');
  return true;
}

// Test specialized validator functions
function testSpecializedValidators() {
  console.log('Testing specialized validators...');
  
  // Valid UUID v4
  const validId = '123e4567-e89b-42d3-a456-556642440000';
  
  try {
    validateTeamId(validId);
    // No exception means validation passed
  } catch (error) {
    console.error(`Valid UUID v4 ${validId} failed team ID validation:`, error);
    return false;
  }
  
  // Check mapping of entity types to parameter names
  const teamParamName = ID_PARAMETER_NAMES[LinearEntityType.TEAM];
  if (teamParamName !== 'teamId') {
    console.error(`Expected parameter name 'teamId' for team entity, got: ${teamParamName}`);
    return false;
  }
  
  console.log('Specialized validators tests passed ✅');
  return true;
}

// Test validateLinearIds function
function testBatchValidation() {
  console.log('Testing batch validation...');
  
  // Mix of valid and invalid IDs
  const ids = {
    team: { id: '123e4567-e89b-42d3-a456-556642440000', entityType: LinearEntityType.TEAM },
    project: { id: 'not-a-uuid', entityType: LinearEntityType.PROJECT },
    issue: { id: '550e8400-e29b-41d4-a716-446655440000', entityType: LinearEntityType.ISSUE }
  };
  
  const errors = validateLinearIds(ids);
  
  // Should have one error for the project ID
  if (errors.length !== 1) {
    console.error(`Expected 1 validation error, got ${errors.length}`);
    return false;
  }
  
  // Error should mention the project entity type
  if (!errors[0].includes(LinearEntityType.PROJECT)) {
    console.error('Error should include entity type, got:', errors[0]);
    return false;
  }
  
  console.log('Batch validation tests passed ✅');
  return true;
}

// Test schemas with example data
function testSchemaValidation() {
  console.log('Testing schema validation with example data...');
  
  // Valid issue creation data
  const validIssueData = {
    teamId: '123e4567-e89b-42d3-a456-556642440000',
    title: 'Test issue',
    description: 'Test description',
    assigneeId: '550e8400-e29b-41d4-a716-446655440000',
    projectId: '123e4567-e89b-42d3-a456-556642440000',
  };
  
  const validResult = CreateIssueSchema.safeParse(validIssueData);
  
  if (!validResult.success) {
    console.error('Valid issue data failed schema validation:', validResult.error);
    return false;
  }
  
  // Invalid issue creation data (invalid team ID)
  const invalidIssueData = {
    teamId: 'not-a-uuid',
    title: 'Test issue',
  };
  
  const invalidResult = CreateIssueSchema.safeParse(invalidIssueData);
  
  if (invalidResult.success) {
    console.error('Invalid issue data incorrectly passed schema validation');
    return false;
  }
  
  console.log('Schema validation tests passed ✅');
  return true;
}

async function runTests() {
  console.log('Running ID management tests...');
  
  const regexResult = testIdRegexPattern();
  const schemaResult = testIdSchemaValidation();
  const validateResult = testValidateFunction();
  const specializedResult = testSpecializedValidators();
  const batchResult = testBatchValidation();
  const exampleResult = testSchemaValidation();
  
  if (regexResult && schemaResult && validateResult && specializedResult && batchResult && exampleResult) {
    console.log('✅ All ID management tests passed!');
  } else {
    console.error('❌ Some ID management tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 