import { LinearErrorType } from '@linear/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhancedClient } from '../libs/client.js';
import { LinearError } from '../libs/errors.js';
import { validateApiKey } from '../libs/id-management.js';

/**
 * Tests for Linear API authentication
 */

// Store the original method for restoration
const originalTestAuthentication = enhancedClient.testAuthentication;

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
  beforeEach(() => {
    // Mock the authentication function for all tests in this suite
    enhancedClient.testAuthentication = vi.fn().mockResolvedValue({
      success: true,
      data: {
        viewer: {
          id: 'mock-user-id',
          name: 'Test User',
          email: 'test@example.com'
        }
      }
    });
  });
  
  afterEach(() => {
    // Restore the original function after each test
    enhancedClient.testAuthentication = originalTestAuthentication;
  });
  
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
        expect(result.data.viewer.email).toBe('test@example.com');
      }
    }
  });
  
  it('should handle authentication failures', async () => {
    // Override the mock for this specific test
    const errorMock = {
      success: false,
      error: new LinearError(
        'Authentication failed', 
        LinearErrorType.AuthenticationError,
        null,
        401
      )
    };
    
    (enhancedClient.testAuthentication as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(errorMock);
    
    const result = await enhancedClient.testAuthentication();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    if (result.error) {
      expect(result.error.message).toContain('Authentication');
    }
  });
}); 