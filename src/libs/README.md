# Linear Client Migration Utilities

This directory contains utilities for the migration from the original Linear SDK client to the enhanced GraphQL-based client.

## Migration Architecture

The migration follows these key principles:

1. **Incremental Migration**: Methods are migrated one at a time, allowing for gradual transition
2. **Backward Compatibility**: GraphQL responses match SDK response shapes where possible
3. **Standardized Error Handling**: All errors follow consistent patterns with typed error objects
4. **Uniform Method Patterns**: All methods follow the same implementation structure
5. **Safe Method Variants**: All methods have both throwing and non-throwing variants

## Method Implementation Pattern

All migrated methods follow this standard pattern:

```typescript
// Standard method (throws errors)
async methodName(params): Promise<ReturnType> {
  try {
    // 1. Validate parameters
    validateParams(params);
    
    // 2. Execute GraphQL query
    const response = await this.executeGraphQLQuery<ResponseType>(query, variables);
    
    // 3. Validate & transform response
    if (!response.data || !response.data.entity) {
      throw new LinearError(...);
    }
    
    // 4. Return typed data
    return response.data.entity;
  } catch (error) {
    // 5. Error handling
    if (error instanceof LinearError) {
      throw error;
    }
    throw new LinearError(...);
  }
}

// Safe method (returns Result object)
async safeMethodName(params): Promise<LinearResult<ReturnType>> {
  try {
    const result = await this.methodName(params);
    return createSuccessResult<ReturnType>(result);
  } catch (error) {
    return createErrorResult<ReturnType>(error instanceof LinearError ? 
      error : new LinearError(...));
  }
}
```

## Utility Files

This directory contains the following key utility files:

### 1. `client.ts`

Contains both the original `linearClient` (from Linear SDK) and the enhanced GraphQL-based `enhancedClient`.

The `enhancedClient` extends the original client with:
- GraphQL query execution methods
- Enhanced error handling
- Type-safe interfaces

### 2. `errors.ts`

Contains error handling utilities:
- `LinearError` class for standardized errors
- `LinearErrorType` enum for error categorization
- `LinearResult` interface for non-throwing methods
- Helper functions for creating and logging errors

### 3. `id-management.ts`

Contains ID validation utilities:
- Regular expressions for validating Linear entity IDs
- Validation functions for specific entity types
- Type definitions for entity ID parameters

### 4. `migration-utils.ts`

Contains utilities specifically designed to assist in the migration:
- GraphQL query builders for different entity types
- Helper functions for entity field selection
- Methods to transform SDK responses to GraphQL format
- Utility functions for creating standardized method implementations

### 5. `utils.ts`

Contains general utility functions:
- Date formatting
- Priority label conversion
- Text processing helpers

## GraphQL Query Patterns

All GraphQL queries follow these patterns:

1. **Named Operations**:
   ```graphql
   query GetIssue($issueId: String!) {
     issue(id: $issueId) {
       # fields
     }
   }
   ```

2. **Complete Field Selection**:
   - Always include ID fields first
   - Group related fields together
   - Include nested fields for relationships
   - Match the shape expected by consumer code

3. **Nested Selection**:
   ```graphql
   query GetIssue($issueId: String!) {
     issue(id: $issueId) {
       id
       title
       # Primary fields...
       
       # Nested relationship fields
       team {
         id
         name
       }
       labels {
         nodes {
           id
           name
         }
       }
     }
   }
   ```

## Error Handling Patterns

All methods handle errors following these standards:

1. **Parameter Validation**: Validate inputs before making API calls
2. **Response Validation**: Check for null/undefined responses
3. **Error Transformation**: Convert all errors to `LinearError` types
4. **Error Classification**: Use appropriate `LinearErrorType` values
5. **Error Messages**: Use consistent error message formats

## Testing Patterns

See the `tests/` directory for examples of testing patterns, including:

1. **Happy Path Tests**: Testing successful operations
2. **Validation Tests**: Testing parameter validation
3. **Error Handling Tests**: Testing API errors
4. **Edge Case Tests**: Testing unusual scenarios

## Migration Strategy

1. Migrate core query methods first (get single entity)
2. Migrate mutation methods next (create, update)
3. Migrate list methods last (get multiple entities)
4. Update consumer code incrementally as methods are migrated

## Helper Utilities

The `migration-utils.ts` file provides utilities to help with migration:
- `buildGraphQLQuery`: Creates standardized queries
- `createEntityMethod`: Creates method implementations with standard patterns
- `createSafeMethod`: Creates non-throwing variants of methods
- `compareClientResults`: Validates GraphQL responses match SDK responses 