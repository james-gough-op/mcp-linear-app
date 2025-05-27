import { LinearErrorType } from '@linear/sdk';
import { describe, expect, it } from 'vitest';
import { ErrorCategory, McpResponse, formatCatchErrorResponse, formatErrorResponse, formatGenericErrorResponse, formatValidationError } from '../libs/error-utils.js';
import { LinearError } from '../libs/errors.js';

describe('Error Utilities', () => {
  describe('formatErrorResponse', () => {
    it('should format a LinearError with authentication error type correctly', () => {
      const error = new LinearError('API key is invalid', "AuthenticationError" as LinearErrorType);
      const response = formatErrorResponse(error);
      
      expect(response).toHaveProperty('content');
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0].text).toContain('Authentication error');
      expect(response.content[0].text).toContain('API key is invalid');
      expect(response.content[0].text).toContain('Please check your Linear API key');
    });
    
    it('should format a LinearError with permission error type correctly', () => {
      const error = new LinearError('No permission to access this resource', "Forbidden" as LinearErrorType);
      const response = formatErrorResponse(error);
      
      expect(response.content[0].text).toContain('Permission denied');
      expect(response.content[0].text).toContain('No permission to access this resource');
      expect(response.content[0].text).toContain('Please check your account permissions');
    });
    
    it('should format a LinearError with network error type correctly', () => {
      const error = new LinearError('Connection failed', "NetworkError" as LinearErrorType);
      const response = formatErrorResponse(error);
      
      expect(response.content[0].text).toContain('Network error');
      expect(response.content[0].text).toContain('Connection failed');
      expect(response.content[0].text).toContain('Please check your internet connection');
    });
    
    it('should handle undefined errors gracefully', () => {
      const response = formatErrorResponse(undefined);
      
      expect(response.content[0].text).toContain('An unknown error occurred');
    });
  });
  
  describe('formatValidationError', () => {
    it('should format a validation error correctly', () => {
      const response = formatValidationError('title', 'Title cannot be empty');
      
      expect(response.content[0].text).toContain('Error: Validation error: title: Title cannot be empty');
    });
  });
  
  describe('formatGenericErrorResponse', () => {
    it('should format a generic error message correctly', () => {
      const response = formatGenericErrorResponse('Something went wrong');
      
      expect(response.content[0].text).toContain('Error: Something went wrong');
    });
    
    it('should provide a default message if none is provided', () => {
      const response = formatGenericErrorResponse();
      
      expect(response.content[0].text).toContain('An error occurred while processing your request');
    });
  });
  
  describe('formatCatchErrorResponse', () => {
    it('should format a caught LinearError correctly', () => {
      const error = new LinearError('API key is invalid', "AuthenticationError" as LinearErrorType);
      const response = formatCatchErrorResponse(error);
      
      expect(response.content[0].text).toContain('Authentication error');
      expect(response.content[0].text).toContain('API key is invalid');
    });
    
    it('should format a caught Error correctly', () => {
      const error = new Error('Something went wrong');
      const response = formatCatchErrorResponse(error);
      
      expect(response.content[0].text).toContain('Unexpected error');
      expect(response.content[0].text).toContain('Something went wrong');
    });
    
    it('should handle non-Error objects gracefully', () => {
      const response = formatCatchErrorResponse('Not an error');
      
      expect(response.content[0].text).toContain('Unexpected error');
      expect(response.content[0].text).toContain('Unknown error');
    });
  });
  
  describe('ErrorCategory enum', () => {
    it('should have all required error categories', () => {
      expect(ErrorCategory.Validation).toBe('Validation error');
      expect(ErrorCategory.Authentication).toBe('Authentication error');
      expect(ErrorCategory.Authorization).toBe('Permission denied');
      expect(ErrorCategory.NotFound).toBe('Not found');
      expect(ErrorCategory.Api).toBe('API error');
      expect(ErrorCategory.Network).toBe('Network error');
      expect(ErrorCategory.Unexpected).toBe('Unexpected error');
    });
  });
  
  describe('McpResponse type', () => {
    it('should match the expected format', () => {
      const response: McpResponse = {
        content: [{
          type: "text",
          text: "This is a test message"
        }],
        isError: true
      };
      
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text', 'This is a test message');
    });
  });
}); 