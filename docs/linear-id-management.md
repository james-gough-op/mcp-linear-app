# Linear ID Management Strategy

This document outlines the approach for handling entity IDs from the Linear API in the MCP Server.

## Overview

Linear uses UUIDs (version 4) for all entity identifiers. The MCP Server implements a standardized strategy for:

- Validating Linear entity IDs (format and structure)
- Standardizing parameter naming conventions
- Building type-safe schemas for operations
- Handling validation errors consistently
- Documenting ID requirements for operations

## Linear ID Format

All Linear entity identifiers adhere to the UUID v4 format:
- 36 characters in length
- 32 hexadecimal digits with 4 hyphens in specific positions
- Example: `123e4567-e89b-42d3-a456-556642440000`

The MCP Server validates this format using a regular expression pattern:
```
/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
```

## Entity Types and Parameter Naming

The following table shows the entity types and their standard parameter naming conventions:

| Entity Type    | Parameter Name      | Example Value                          |
|----------------|---------------------|----------------------------------------|
| Team           | `teamId`            | `123e4567-e89b-42d3-a456-556642440000` |
| Project        | `projectId`         | `123e4567-e89b-42d3-a456-556642440000` |
| Issue          | `issueId`           | `123e4567-e89b-42d3-a456-556642440000` |
| Cycle          | `cycleId`           | `123e4567-e89b-42d3-a456-556642440000` |
| Label          | `labelId`           | `123e4567-e89b-42d3-a456-556642440000` |
| User           | `userId`            | `123e4567-e89b-42d3-a456-556642440000` |
| Template       | `templateId`        | `123e4567-e89b-42d3-a456-556642440000` |
| Comment        | `commentId`         | `123e4567-e89b-42d3-a456-556642440000` |
| Roadmap        | `roadmapId`         | `123e4567-e89b-42d3-a456-556642440000` |
| Milestone      | `milestoneId`       | `123e4567-e89b-42d3-a456-556642440000` |
| Workflow State | `workflowStateId`   | `123e4567-e89b-42d3-a456-556642440000` |

## Validation Utilities

The MCP Server provides several utilities for validating Linear entity IDs:

### 1. Basic ID Schema Validation

```typescript
import { LinearIdSchema } from '../libs/id-management.js';

// Validates a string against UUID v4 format
const result = LinearIdSchema.safeParse(id);
if (!result.success) {
  // Handle validation error
  console.error(result.error);
}
```

### 2. Entity-Specific Validation

```typescript
import { validateTeamId, validateProjectId } from '../libs/id-management.js';

// Throws LinearError with VALIDATION type if invalid
try {
  validateTeamId('team-id-here');
  validateProjectId('project-id-here');
} catch (error) {
  // Handle validation error
  console.error(error.message);
}
```

### 3. Batch Validation

```typescript
import { validateLinearIds, LinearEntityType } from '../libs/id-management.js';

// Validate multiple IDs at once
const ids = {
  team: { id: 'team-id-here', entityType: LinearEntityType.TEAM },
  project: { id: 'project-id-here', entityType: LinearEntityType.PROJECT }
};

const errors = validateLinearIds(ids);
if (errors.length > 0) {
  // Handle validation errors
  console.error(errors);
}
```

### 4. Schema-Based Validation

```typescript
import { CreateIssueSchema } from '../libs/id-management.js';

// Validate a complex object with IDs
const issueData = {
  teamId: 'team-id-here',
  title: 'New issue',
  assigneeId: 'user-id-here',
  projectId: 'project-id-here'
};

const result = CreateIssueSchema.safeParse(issueData);
if (!result.success) {
  // Handle validation errors
  console.error(result.error.format());
}
```

## Common Operations and Required IDs

The following table outlines common operations and their required entity IDs:

| Operation            | Required IDs                | Optional IDs                            |
|----------------------|-----------------------------|----------------------------------------|
| Create Issue         | `teamId`                    | `assigneeId`, `labelIds`, `projectId`  |
| Update Issue         | `issueId`                   | `assigneeId`, `labelIds`, `projectId`  |
| Create Comment       | `issueId`                   | -                                      |
| Create Label         | -                           | `teamId`                               |
| Assign Issue         | `issueId`, `userId`         | -                                      |
| Move Issue to Cycle  | `issueId`, `cycleId`        | -                                      |
| Move Issue to Project| `issueId`, `projectId`      | -                                      |

## Error Handling

When a Linear entity ID fails validation, the MCP Server throws a `LinearError` with type `VALIDATION`. These errors include:

- The entity type for context (e.g., "Invalid team ID format")
- A detailed message explaining the validation failure
- Integration with the standard error handling system

Example error message:
```
Invalid team ID format: Linear IDs must be valid UUID v4 strings.
```

## Obtaining Linear Entity IDs

Linear entity IDs can be obtained through several methods:

1. **Linear Web Application**
   - Open an entity (e.g., issue, project) in the Linear web app
   - The ID is visible in the URL (e.g., `https://linear.app/company/issue/ABC-123/title` where the UUID is embedded)

2. **Linear API Queries**
   - Use the GraphQL API to query for entities
   - Each entity response includes an `id` field with the UUID

3. **MCP Server Helper Functions**
   - Future versions will include helper functions to discover and list entities

## Best Practices

1. **Validate Early**
   - Always validate IDs at the earliest point in your code, ideally at the API boundary
   - Use the provided validation utilities to ensure consistent error handling

2. **Use Type-Safe Schemas**
   - Use Zod schemas for complex objects containing multiple entity IDs
   - This provides automatic validation with detailed error messages

3. **Consistent Naming**
   - Follow the parameter naming conventions (e.g., `teamId`, `issueId`) for consistency
   - Use the `ID_PARAMETER_NAMES` mapping for programmatic access

4. **Targeted Error Messages**
   - Errors should clearly indicate which entity ID is invalid
   - Include the parameter name in error messages for easier debugging

5. **Integration with Error Handling**
   - ID validation errors are integrated with the standard error handling system
   - Use the structured error handling patterns established in the MCP Server

## Testing

You can test the ID management utilities using:

```bash
npm run test:ids
```

This runs a comprehensive suite of tests that validate:
- UUID format detection
- Schema validation
- Entity-specific validation
- Batch validation
- Integration with the error handling system 