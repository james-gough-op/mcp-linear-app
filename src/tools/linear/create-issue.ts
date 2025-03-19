import { createSafeTool } from "../../libs/tool-utils.js";
import { z } from "zod";
import linearClient from '../../libs/client.js';
import { getPriorityLabel, formatDate, safeText, getStateId, normalizeStateName } from '../../libs/utils.js';

/**
 * Enum for Linear issue states/statuses
 */
export enum LinearIssueState {
  Triage = "triage",
  Backlog = "backlog",
  Todo = "todo",
  InProgress = "in_progress", 
  Done = "done",
  Canceled = "canceled"
}

/**
 * Enum for Linear issue priorities
 */
export enum LinearIssuePriority {
  NoPriority = 0,
  Urgent = 1,
  High = 2, 
  Medium = 3,
  Low = 4
}

// Define string mappings for the priorities
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0,
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'low': 4
};

// State string mappings have been replaced with a dynamic function 
// that calls the Linear API to get valid state IDs

/**
 * Interface for issue response data
 */
interface IssueResponseData {
  id?: string;
  title?: string;
  description?: string;
  priority?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  dueDate?: string | Date;
  url?: string;
  parent?: {
    id?: string;
    title?: string;
  };
  state?: {
    id?: string;
    name?: string;
    color?: string;
  };
  team?: {
    id?: string;
    name?: string;
  };
  [key: string]: unknown;
}

/**
 * Interface for Linear API create response
 */
interface LinearCreateResponse {
  success?: boolean;
  issue?: IssueResponseData;
  [key: string]: unknown;
}

/**
 * Format issue data into human-readable text
 * @param issue Issue data to format
 * @returns Formatted text for human readability
 */
function formatIssueToHumanReadable(issue: IssueResponseData): string {
  if (!issue || !issue.id) {
    return "Invalid or incomplete issue data";
  }

  let result = "LINEAR ISSUE CREATED\n";
  result += "==================\n\n";
  
  // Basic information
  result += `--- ISSUE DETAILS ---\n`;
  result += `ID: ${issue.id}\n`;
  result += `TITLE: ${safeText(issue.title)}\n`;
  result += `DESCRIPTION: ${safeText(issue.description)}\n\n`;
  
  // Status and priority
  result += `--- STATUS INFO ---\n`;
  if (issue.state && issue.state.name) {
    result += `STATUS: ${issue.state.name}\n`;
  }
  result += `PRIORITY: ${getPriorityLabel(issue.priority)}\n\n`;
  
  // Parent information if exists
  if (issue.parent && issue.parent.id) {
    result += `--- PARENT ISSUE ---\n`;
    result += `PARENT ID: ${issue.parent.id}\n`;
    if (issue.parent.title) {
      result += `PARENT TITLE: ${safeText(issue.parent.title)}\n`;
    }
    result += `\n`;
  }
  
  // Team information
  result += `--- TEAM INFO ---\n`;
  if (issue.team && issue.team.name) {
    result += `TEAM: ${issue.team.name}\n`;
  }
  
  // Dates
  result += `--- TIME INFO ---\n`;
  result += `CREATED AT: ${formatDate(issue.createdAt)}\n`;
  result += `UPDATED AT: ${formatDate(issue.updatedAt)}\n`;
  
  // Due date if present
  if (issue.dueDate) {
    result += `DUE DATE: ${formatDate(issue.dueDate)}\n`;
  }
  
  // URL
  result += `\n--- ACCESS INFO ---\n`;
  result += `URL: ${safeText(issue.url)}\n\n`;
  
  result += "The issue has been successfully created in Linear.";
  
  return result;
}

/**
 * Create issue tool schema definition
 */
const createIssueSchema = z.object({
  teamId: z.string().describe("The team ID the issue belongs to"),
  title: z.string().describe("The title of the issue"),
  description: z.string().describe("The description of the issue"),
  dueDate: z.string().describe("The due date of the issue").optional(),
  status: z.enum([
    "triage", "backlog", "todo", "in_progress", "done", "canceled"
  ]).default("backlog").describe("The status of the issue"),
  priority: z.enum([
    "no_priority", "urgent", "high", "medium", "low"
  ]).default("no_priority").describe("The priority of the issue"),
  parentId: z.string().describe("The ID of the parent issue, used to create a sub-issue").optional(),
});

/**
 * Tool implementation for creating an issue in Linear
 * with human-readable output formatting
 */
export const LinearCreateIssueTool = createSafeTool({
  name: "create_issue",
  description: "A tool that creates an issue in Linear",
  schema: createIssueSchema.shape,
  handler: async (args: z.infer<typeof createIssueSchema>) => {
    try {
      // Validate input
      if (!args.teamId || args.teamId.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Team ID cannot be empty",
          }],
        };
      }
      
      if (!args.title || args.title.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Issue title cannot be empty",
          }],
        };
      }
      
      // Convert priority from string to number if provided
      let priorityValue: number | undefined;
      if (args.priority) {
        priorityValue = PriorityStringToNumber[args.priority];
        if (priorityValue === undefined) {
          return {
            content: [{
              type: "text",
              text: "Error: Priority must be a valid string (no_priority, urgent, high, medium, low)",
            }],
          };
        }
      }

      // Get valid state ID from Linear API if status is provided
      let stateId: string | undefined;
      if (args.status) {
        // Normalize the state name to handle different variations
        const normalizedStateName = normalizeStateName(args.status);
        // Get the actual state ID from Linear API
        stateId = await getStateId(normalizedStateName, args.teamId, linearClient);
        
        if (!stateId) {
          return {
            content: [{
              type: "text",
              text: `Error: Could not find a valid state ID for "${args.status}" in team ${args.teamId}`,
            }],
          };
        }
      }

      // Create the issue
      const createIssueResponse = await linearClient.createIssue({
        title: args.title,
        description: args.description,
        stateId: stateId,
        dueDate: args.dueDate,
        priority: priorityValue,
        teamId: args.teamId,
        parentId: args.parentId,
      });
      
      if (!createIssueResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to create issue. Please check your parameters and try again.",
          }],
        };
      }
      
      // Getting issue ID from response
      // Linear SDK returns results in success and entity pattern
      if (createIssueResponse.success) {
        // Access issue and get ID with correct data type
        const issue = await createIssueResponse.issue;
        if (issue && issue.id) {
          return {
            content: [{
              type: "text",
              text: `Status: Success\nMessage: Linear issue created\nIssue ID: ${issue.id}`,
            }],
          };
        }
      }
      
      // Extract data from response - fix to handle proper response structure
      const createResponse = createIssueResponse as unknown as LinearCreateResponse;
      
      // Check if the response follows the expected structure with success flag
      if (createResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to create issue. Please check your parameters and try again.",
          }],
        };
      }
      
      // Extract issue data from the correct property
      const issueData: IssueResponseData = createResponse.issue || createIssueResponse as unknown as IssueResponseData;
      
      // Directly check the parsed response result
      const issueId = issueData?.id || (createIssueResponse as unknown as { id?: string })?.id;
      if (issueId) {
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear issue created\nIssue ID: ${issueId}`,
          }],
        };
      }
      
      if (!issueData) {
        // Display success message even if data is incomplete
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear issue created",
          }],
        };
      }
      
      if (!issueData.id) {
        // Issue data exists but no ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear issue created (ID not available)",
          }],
        };
      }
      
      // Success case with ID available
      if (issueData.title === undefined && issueData.description === undefined) {
        // Only ID is available, without complete data
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear issue created\nIssue ID: ${issueData.id}`,
          }],
        };
      }
      
      // Format issue data to human-readable text
      const formattedText = formatIssueToHumanReadable(issueData);
      
      // Return formatted text
      return {
        content: [{
          type: "text",
          text: formattedText,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while creating the issue:\n${errorMessage}`,
        }],
      };
    }
  },
}); 