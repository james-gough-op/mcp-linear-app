import { describe, expect, it } from 'vitest';
import { enhancedClient, validateApiKey } from '../libs/client.js';

/**
 * Tests for Linear API authentication
 * 
 * Note: These tests require a valid LINEAR_API_KEY to be set in the environment
 * They are integration tests that make actual calls to the Linear API
 */

describe('API key validation', () => {
  it('should validate a key with correct format', () => {
    // Test with valid format (using fake key for test)
    const validFormatResult = validateApiKey('lin_api_abcd1234567890');
    expect(validFormatResult.valid).toBe(true);
  });
  
  it('should reject undefined key', () => {
    const undefinedResult = validateApiKey(undefined);
    expect(undefinedResult.valid).toBe(false);
    expect(undefinedResult.message).toContain('not set');
  });
  
  it('should reject invalid key format', () => {
    const invalidFormatResult = validateApiKey('invalid_key_format');
    expect(invalidFormatResult.valid).toBe(false);
    expect(invalidFormatResult.message).toContain('invalid format');
  });
});

describe('Linear API Authentication', () => {
  it('should authenticate with the Linear API', async () => {
    const result = await enhancedClient.testAuthentication();
    
    expect(result.success).toBe(true);
    
    if (result.data) {
      // Type-safe access to viewer email
      if (typeof result.data === 'object' &&
          result.data !== null &&
          'viewer' in result.data &&
          result.data.viewer &&
          typeof result.data.viewer === 'object' &&
          'email' in result.data.viewer) {
        expect(typeof result.data.viewer.email).toBe('string');
      }
    }
  });
}); 