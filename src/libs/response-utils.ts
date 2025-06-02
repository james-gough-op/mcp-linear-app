import { Comment, Issue } from '@linear/sdk';
import { McpResponse } from './error-utils.js';
import { safeText } from './utils.js';

/**
 * Format a Linear issue into a human-readable response
 * 
 * @param issue The Linear issue to format
 * @returns A standardized MCP response with formatted issue information
 */
export async function formatIssueResponse(issue: Issue): Promise<McpResponse> {
  if (!issue || !issue.id) {
    return Promise.resolve({
      content: [{
        type: "text",
        text: "Error: Invalid or incomplete issue data provided for formatting."
      }],
      isError: true
    });
  }

  let result = "LINEAR ISSUE DETAILS\n";
  result += "===================\n\n";

  // Basic information
  result += `ID: ${issue.id}\n`;
  result += `IDENTIFIER: ${issue.identifier}\n`;
  result += `TITLE: ${safeText(issue.title)}\n`;
  
  if (issue.description) {
    result += `DESCRIPTION: ${safeText(issue.description)}\n`;
  }
  
  result += `PRIORITY: ${issue.priorityLabel || issue.priority}\n`;
  
  // Access state - which may be a promise
  if (issue.state) {
    try {
      const state = await issue.state;
      result += `STATE: ${safeText(state.name)} (${state.type})\n`;
    } catch (error) {
      result += `STATE: Unable to load state information\n`;
    }
  }
  
  // Team information - which may be a promise
  if (issue.team) {
    try {
      const team = await issue.team;
      result += `TEAM: ${safeText(team.name)} (${team.key})\n`;
    } catch (error) {
      result += `TEAM: Unable to load team information\n`;
    }
  }
  
  // Assignee if present - which may be a promise
  if (issue.assignee) {
    try {
      const assignee = await issue.assignee;
      result += `ASSIGNEE: ${safeText(assignee.name)}\n`;
    } catch (error) {
      result += `ASSIGNEE: Unable to load assignee information\n`;
    }
  }
  
  // Dates
  if (issue.createdAt) {
    result += `CREATED AT: ${new Date(issue.createdAt).toLocaleString()}\n`;
  }
  
  if (issue.updatedAt) {
    result += `UPDATED AT: ${new Date(issue.updatedAt).toLocaleString()}\n`;
  }
  
  if (issue.dueDate) {
    result += `DUE DATE: ${new Date(issue.dueDate).toLocaleDateString()}\n`;
  }
  
  // Labels if present - handle with type casting due to SDK complexity
  if (issue.labels) {
    try {
      // issue.labels is a function that returns a Promise of IssueLabelConnection
      const labelsConnection = await issue.labels();
      if (labelsConnection && labelsConnection.nodes && labelsConnection.nodes.length > 0) {
        const labelStrings = labelsConnection.nodes.map(label => 
          `${safeText(label.name)} (${safeText(label.color)})`
        );
        result += `\nLABELS: ${labelStrings.join(', ')}\n`;
      }
    } catch (error) {
      result += `\nLABELS: Unable to load label information\n`;
    }
  }
  
  // URL if present
  if (issue.url) {
    result += `\nURL: ${issue.url}\n`;
  }

  return Promise.resolve({
    content: [{
      type: "text",
      text: result
    }],
    isError: false
  });
}

/**
 * Format a Linear comment into a human-readable response
 * 
 * @param comment The Linear comment to format
 * @returns A standardized MCP response with formatted comment information
 */
export async function formatCommentResponse(comment: Comment): Promise<McpResponse> {
  if (!comment || !comment.id) {
    return {
      content: [{
        type: "text",
        text: "Error: Invalid or incomplete comment data provided for formatting."
      }],
      isError: true
    };
  }

  let result = "LINEAR COMMENT DETAILS\n";
  result += "======================\n\n";

  // Basic information
  result += `ID: ${comment.id}\n`;
  result += `BODY: ${safeText(comment.body)}\n`;
  
  // User information - which may be a promise
  if (comment.user) {
    try {
      const user = await comment.user;
      result += `AUTHOR: ${safeText(user.name)}\n`;
    } catch (error) {
      result += `AUTHOR: Unable to load author information\n`;
    }
  }
  
  // Issue information - which may be a promise
  if (comment.issue) {
    try {
      const issue = await comment.issue;
      result += `ON ISSUE: ${issue.identifier} - ${safeText(issue.title)}\n`;
    } catch (error) {
      result += `ON ISSUE: Unable to load issue information\n`;
    }
  }
  
  // Dates
  if (comment.createdAt) {
    result += `CREATED AT: ${new Date(comment.createdAt).toLocaleString()}\n`;
  }
  
  if (comment.updatedAt) {
    result += `UPDATED AT: ${new Date(comment.updatedAt).toLocaleString()}\n`;
  }
  
  if (comment.editedAt) {
    result += `EDITED AT: ${new Date(comment.editedAt).toLocaleString()}\n`;
  }

  return {
    content: [{
      type: "text",
      text: result
    }],
    isError: false
  };
}

/**
 * Format an operation success message
 * 
 * @param operation The operation that succeeded (e.g., "created", "updated", "deleted")
 * @param entity The type of entity (e.g., "issue", "comment", "label")
 * @param details Additional details about the operation
 * @returns A standardized MCP response with success message
 */
export function formatSuccessResponse(operation: string, entity: string, details?: string): McpResponse {
  const message = `Success: ${entity} ${operation}${details ? `: ${details}` : ''}.`;
  
  return {
    content: [{
      type: "text",
      text: message
    }],
    isError: false
  };
}

/**
 * Format a create success message
 * 
 * @param entity The type of entity created (e.g., "issue", "comment", "label")
 * @param details Additional details about the created entity
 * @returns A standardized MCP response with creation success message
 */
export function formatCreateSuccessResponse(entity: string, details?: string): McpResponse {
  return formatSuccessResponse("created", entity, details);
}

/**
 * Format an update success message
 * 
 * @param entity The type of entity updated (e.g., "issue", "comment", "label")
 * @param details Additional details about the updated entity
 * @returns A standardized MCP response with update success message
 */
export function formatUpdateSuccessResponse(entity: string, details?: string): McpResponse {
  return formatSuccessResponse("updated", entity, details);
}

/**
 * Format a delete success message
 * 
 * @param entity The type of entity deleted (e.g., "issue", "comment", "label")
 * @param details Additional details about the deleted entity
 * @returns A standardized MCP response with deletion success message
 */
export function formatDeleteSuccessResponse(entity: string, details?: string): McpResponse {
  return formatSuccessResponse("deleted", entity, details);
}

/**
 * Format a search results message
 * 
 * @param entity The type of entity searched (e.g., "issues", "comments", "labels")
 * @param count The number of results found
 * @param details Additional details about the search
 * @returns A standardized MCP response with search results message
 */
export function formatSearchResultsResponse(entity: string, count: number, details?: string): McpResponse {
  const message = `Found ${count} ${entity}${details ? ` ${details}` : ''}.`;
  
  return {
    content: [{
      type: "text",
      text: message
    }],
    isError: false
  };
} 