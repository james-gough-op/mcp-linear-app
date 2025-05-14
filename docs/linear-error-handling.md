# Linear API Error Handling

This document explains the standardized error handling mechanism for Linear API interactions in the MCP Server.

## Overview

The MCP Server implements a consistent and comprehensive error handling system for all Linear API interactions. This system:

- Translates Linear's error responses into standardized error types
- Provides user-friendly error messages with actionable information
- Logs detailed error information for debugging
- Implements special handling for rate limit errors
- Offers both exception-based and result-based error handling patterns

## Error Types

The system defines the following standardized error types:

| Error Type | Description | Common Causes |
|------------|-------------|--------------|
| `AUTHENTICATION` | Authentication failed | Invalid API key, expired token |
| `PERMISSION` | Permission denied | Insufficient permissions for the operation |
| `NOT_FOUND` | Resource not found | Invalid ID, entity doesn't exist |
| `RATE_LIMIT` | Rate limit exceeded | Too many requests in a short time period |
| `VALIDATION` | Request validation failed | Invalid query format, schema errors |
| `NETWORK` | Network connectivity issue | Connection problems, server unreachable |
| `UNKNOWN` | Unclassified error | Any error that doesn't fit into above categories |

## Error Handling Patterns

The MCP Server provides two patterns for handling Linear API errors:

### 1. Exception-Based Pattern

This pattern throws `LinearError` exceptions that you can catch and handle:

```typescript
import { LinearError, LinearErrorType } from '../libs/errors.js';

try {
  // Attempt a GraphQL query
  const response = await enhancedClient.executeGraphQLQuery(query, variables);
  // Process successful response
} catch (error) {
  if (error instanceof LinearError) {
    // Handle specific error types
    switch (error.type) {
      case LinearErrorType.RATE_LIMIT:
        console.log(`Rate limited. Try again in ${error.retryAfter} seconds`);
        break;
      case LinearErrorType.NOT_FOUND:
        console.log('Resource not found:', error.message);
        break;
      // Handle other error types
      default:
        console.log('Linear API error:', error.userMessage);
    }
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

### 2. Result-Based Pattern

This pattern returns a `LinearResult` object with success/error information:

```typescript
import { LinearResult } from '../libs/errors.js';

// Execute query with built-in error handling
const result = await enhancedClient.safeExecuteGraphQLQuery(query, variables);

if (result.success) {
  // Process successful response
  const data = result.data;
  console.log('Query succeeded:', data);
} else {
  // Handle error
  const error = result.error;
  console.log('Query failed:', error.userMessage);
  
  // You can still check specific error types
  if (error.type === LinearErrorType.RATE_LIMIT) {
    console.log(`Try again in ${error.retryAfter} seconds`);
  }
}
```

## Error Properties

The `LinearError` class provides several useful properties:

- `message`: The original error message from Linear
- `userMessage`: A user-friendly message with suggested action
- `type`: The standardized error type (from `LinearErrorType` enum)
- `status`: HTTP status code (if applicable)
- `retryAfter`: Seconds to wait before retrying (for rate limit errors)
- `path`: GraphQL path where the error occurred (if available)
- `code`: Error code from Linear API (if available)
- `originalError`: The original error object (for debugging)

## Rate Limit Handling

Rate limit errors (HTTP 429) receive special handling:

- The `retryAfter` property contains the number of seconds to wait
- The `userMessage` includes this waiting time
- All rate limit errors are consistently logged with detailed information

## Error Logging

All Linear API errors are automatically logged with consistent formatting:

```
Linear API Error [ERROR_TYPE]: Error message
{
  type: 'ERROR_TYPE',
  message: 'Original error message',
  userMessage: 'User-friendly message',
  status: 400,
  path: ['path', 'to', 'error'],
  code: 'ERROR_CODE',
  retryAfter: 30,
  context: { query: '...', variables: {...} }
}
```

## Testing Errors

You can test the error handling system using:

```bash
npm run test:errors
```

This runs a suite of tests that verify:
- Error classification and typing
- GraphQL error parsing
- Result helper functions
- Safe execution methods

## Example: Error Handling Best Practices

### For Interactive UI Applications

```typescript
// Use result-based pattern for UI-bound operations
const result = await enhancedClient.safeExecuteGraphQLQuery(query);

if (result.success) {
  // Update UI with success state
} else {
  // Display error message to user
  notifyUser(result.error.userMessage);
  
  // Special handling for rate limits
  if (result.error.type === LinearErrorType.RATE_LIMIT) {
    startRetryCountdown(result.error.retryAfter);
  }
}
```

### For Backend Services

```typescript
// Use exception-based pattern for detailed error handling
try {
  const response = await enhancedClient.executeGraphQLQuery(query);
  return processResponse(response);
} catch (error) {
  if (error instanceof LinearError) {
    // Log and handle specific error types
    switch (error.type) {
      case LinearErrorType.RATE_LIMIT:
        // Implement exponential backoff
        await delay(error.retryAfter * 1000);
        return retryOperation();
        
      case LinearErrorType.AUTHENTICATION:
        // Trigger authentication refresh
        await refreshCredentials();
        return retryOperation();
        
      // Handle other cases
      default:
        // Log and propagate error
        throw error;
    }
  }
  throw error;
}
```

## Related Documentation

- [Linear API Documentation](https://developers.linear.app/docs/graphql/error-handling)
- [Linear Authentication](docs/linear-authentication.md) 