# Linear API Client

This directory contains utilities for interacting with the Linear API.

## client.ts

The `client.ts` file provides a Linear API client with enhanced GraphQL capabilities.

### Basic Usage

```typescript
import linearClient, { enhancedClient } from './client.js';

// Using the standard Linear SDK client
const issues = await linearClient.issues();

// Using the enhanced client for custom GraphQL operations
const query = `
  query {
    viewer {
      id
      name
      email
    }
  }
`;

const response = await enhancedClient.executeGraphQLQuery(query);
console.log(response.data.viewer);
```

### GraphQL Queries

Use the `executeGraphQLQuery` method to run GraphQL queries:

```typescript
const query = `
  query GetTeam($teamId: String!) {
    team(id: $teamId) {
      id
      name
      key
    }
  }
`;

const variables = { teamId: 'TEAM_ID_HERE' };
const response = await enhancedClient.executeGraphQLQuery(query, variables);
```

### GraphQL Mutations

Use the `executeGraphQLMutation` method to run GraphQL mutations:

```typescript
const mutation = `
  mutation CreateIssue($title: String!, $teamId: String!) {
    issueCreate(input: {
      title: $title,
      teamId: $teamId
    }) {
      success
      issue {
        id
        title
      }
    }
  }
`;

const variables = { 
  title: 'New issue title', 
  teamId: 'TEAM_ID_HERE'
};

const response = await enhancedClient.executeGraphQLMutation(mutation, variables);
```

### Error Handling

Basic error handling is provided in the current implementation. Comprehensive error handling will be enhanced in future updates.

## Configuration

The Linear client is configured using environment variables:

- `LINEAR_API_KEY`: Your Linear API key

Make sure to set these variables in your `.env` file before using the client. 