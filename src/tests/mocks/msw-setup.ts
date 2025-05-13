import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './handlers.js';

// Initialize server before tests
export const setupMockServer = () => {
  // Establish API mocking before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  
  // Reset handlers between tests (if specific tests need different handlers)
  afterEach(() => server.resetHandlers());
  
  // Clean up after tests are done
  afterAll(() => server.close());
}; 