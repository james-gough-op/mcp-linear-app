import { enhancedClient, validateApiKey } from '../libs/client.js';

/**
 * Tests for Linear API authentication
 * 
 * Note: These tests require a valid LINEAR_API_KEY to be set in the environment
 * They are integration tests that make actual calls to the Linear API
 */

// Test API key validation function
function testApiKeyValidation() {
  console.log('Testing API key validation...');
  
  // Test with valid format (using fake key for test)
  const validFormatResult = validateApiKey('lin_api_abcd1234567890');
  
  if (!validFormatResult.valid) {
    console.error('Validation incorrectly failed for valid format key:', validFormatResult.message);
    return false;
  }
  
  // Test with undefined key
  const undefinedResult = validateApiKey(undefined);
  
  if (undefinedResult.valid || !undefinedResult.message?.includes('not set')) {
    console.error('Validation should fail for undefined key');
    return false;
  }
  
  // Test with invalid format
  const invalidFormatResult = validateApiKey('invalid_key_format');
  
  if (invalidFormatResult.valid || !invalidFormatResult.message?.includes('invalid format')) {
    console.error('Validation should fail for invalid format');
    return false;
  }
  
  console.log('API key validation tests passed ✅');
  return true;
}

// Test actual authentication
async function testLiveAuthentication() {
  console.log('Testing live authentication with Linear API...');
  
  try {
    const result = await enhancedClient.testAuthentication();
    
    if (result.success) {
      console.log('Authentication successful! ✅');
      // Type-safe access to viewer email
      if (result.data && 
          typeof result.data === 'object' &&
          result.data !== null &&
          'viewer' in result.data &&
          result.data.viewer &&
          typeof result.data.viewer === 'object' &&
          'email' in result.data.viewer) {
        console.log('Authenticated as:', result.data.viewer.email);
      }
      return true;
    } else {
      console.error('Authentication failed:', result.error?.message);
      console.error('Error type:', result.error?.type);
      return false;
    }
  } catch (error) {
    console.error('Unexpected error during authentication test:', error);
    return false;
  }
}

async function runTests() {
  console.log('Running authentication tests...');
  
  const validationResult = testApiKeyValidation();
  const authResult = await testLiveAuthentication();
  
  if (validationResult && authResult) {
    console.log('✅ All authentication tests passed!');
  } else {
    console.error('❌ Some authentication tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 