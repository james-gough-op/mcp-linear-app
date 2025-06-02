import { LinearClient } from '@linear/sdk';
import enhancedClient from './client.js';

// Mock client for testing
let mockClient: typeof enhancedClient | null = null;

/**
 * Returns the Linear client instance
 * This function can be mocked during testing
 */
export function getLinearClient() {
  // If a mock client is set, return it instead of the real client
  if (mockClient) {
    return mockClient;
  }
  
  // Otherwise return the real enhanced client
  return enhancedClient;
}

/**
 * Sets a mock client for testing
 * @param client - The mock client to use
 */
export function setMockLinearClient(client: typeof enhancedClient) {
  mockClient = client;
}

/**
 * Resets the client to the original instance
 * This should be called after tests to clean up
 */
export function resetLinearClient() {
  mockClient = null;
}

/**
 * Creates a real Linear client with the given API key
 * This is useful when you need to create a new client instance
 * @param apiKey - The Linear API key
 */
export function createRealLinearClient(apiKey: string) {
  return new LinearClient({ apiKey });
} 