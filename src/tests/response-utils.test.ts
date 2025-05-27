import { describe, expect, it } from 'vitest';
import { McpResponse } from '../libs/error-utils.js';
import { formatCreateSuccessResponse, formatDeleteSuccessResponse, formatSearchResultsResponse, formatSuccessResponse, formatUpdateSuccessResponse } from '../libs/response-utils.js';

describe('Response Utilities', () => {
  describe('formatSuccessResponse', () => {
    it('should format a success message correctly', () => {
      const response = formatSuccessResponse('created', 'issue');
      
      expect(response).toHaveProperty('content');
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0].text).toBe('Success: issue created.');
    });
    
    it('should include details when provided', () => {
      const response = formatSuccessResponse('updated', 'comment', 'ID-123, on issue ID-456');
      
      expect(response.content[0].text).toBe('Success: comment updated: ID-123, on issue ID-456.');
    });
  });
  
  describe('formatCreateSuccessResponse', () => {
    it('should format a create success message correctly', () => {
      const response = formatCreateSuccessResponse('issue');
      
      expect(response.content[0].text).toBe('Success: issue created.');
    });
    
    it('should include details when provided', () => {
      const response = formatCreateSuccessResponse('issue', 'ID-123, assigned to team XYZ');
      
      expect(response.content[0].text).toBe('Success: issue created: ID-123, assigned to team XYZ.');
    });
  });
  
  describe('formatUpdateSuccessResponse', () => {
    it('should format an update success message correctly', () => {
      const response = formatUpdateSuccessResponse('comment');
      
      expect(response.content[0].text).toBe('Success: comment updated.');
    });
    
    it('should include details when provided', () => {
      const response = formatUpdateSuccessResponse('issue', 'ID-123, priority changed to high');
      
      expect(response.content[0].text).toBe('Success: issue updated: ID-123, priority changed to high.');
    });
  });
  
  describe('formatDeleteSuccessResponse', () => {
    it('should format a delete success message correctly', () => {
      const response = formatDeleteSuccessResponse('comment');
      
      expect(response.content[0].text).toBe('Success: comment deleted.');
    });
    
    it('should include details when provided', () => {
      const response = formatDeleteSuccessResponse('issue', 'ID-123');
      
      expect(response.content[0].text).toBe('Success: issue deleted: ID-123.');
    });
  });
  
  describe('formatSearchResultsResponse', () => {
    it('should format a search results message correctly', () => {
      const response = formatSearchResultsResponse('issues', 5);
      
      expect(response.content[0].text).toBe('Found 5 issues.');
    });
    
    it('should include details when provided', () => {
      const response = formatSearchResultsResponse('issues', 10, 'with high priority');
      
      expect(response.content[0].text).toBe('Found 10 issues with high priority.');
    });
    
    it('should handle zero results correctly', () => {
      const response = formatSearchResultsResponse('comments', 0, 'matching the search query');
      
      expect(response.content[0].text).toBe('Found 0 comments matching the search query.');
    });
  });

  describe('McpResponse type', () => {
    it('should match the expected format', () => {
      const response: McpResponse = {
        content: [{
          type: "text",
          text: "This is a test message"
        }]
      };
      
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text', 'This is a test message');
    });
  });
}); 