import { Issue } from "@linear/sdk";
import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { getStateId, normalizeStateName } from '../../libs/utils.js';

/**
 * Enum for Linear issue priorities as strings for schema
 */
export const PriorityStringValues = ["no_priority", "urgent", "high", "medium", "low"] as const;

// Define string mappings for the priorities
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0,
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'low': 4
};

/**
 * Interface for Linear API update response
 */
interface IssueUpdateResponse {
  success?: boolean;
  issueUpdate?: {
    issue: Issue;
    success: boolean;
  };
}

/**
 * Update issue tool schema definition
 */
const updateIssueSchema = z.object({
  id: z.string().describe("The ID of the issue to update"),
  title: z.string().describe("The title of the issue").optional(),
  description: z.string().describe("The description of the issue").optional(),
  dueDate: z.string().describe("The due date of the issue").optional(),
  status: z.enum([
    "triage", "backlog", "todo", "in_progress", "done", "canceled"
  ]).default("backlog").describe("The status of the issue"),
  priority: z.enum([
    "no_priority", "urgent", "high", "medium", "low"
  ]).default("no_priority").describe("The priority of the issue"),
  sortOrder: z.number().describe("The sort order of the issue").optional(),
  trashed: z.boolean().describe("Whether the issue is trashed").optional(),
  parentId: z.string().describe("The ID of the parent issue, used to create a sub-issue").optional(),
});

export const LinearUpdateIssueTool = createSafeTool({
  name: "update_issue",
  description: "A tool that updates an issue in Linear",
  schema: updateIssueSchema.shape,
  handler: async (args: z.infer<typeof updateIssueSchema>): Promise<{ content: { type: "text"; text: string; }[]; }> => {
    try {
      // Validate input
      if (!args.id || args.id.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Issue ID cannot be empty",
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
      
      // Get the issue to update to retrieve its team ID
      let teamId: string | undefined;
      try {
        const issueResponse = await enhancedClient.safeGetIssue(args.id);
        if (issueResponse) {
          teamId = await issueResponse.data?.team?.then((team) => team.id);
        }
      } catch (error) {
        console.error("Error fetching issue for team ID:", error);
      }
      
      // Get valid state ID from Linear API if status is provided
      let stateId: string | undefined;
      if (args.status && teamId) {
        // Normalize the state name to handle different variations
        const normalizedStateName = normalizeStateName(args.status);
        // Get the actual state ID from Linear API
        stateId = await getStateId(normalizedStateName, teamId);
        
        if (!stateId) {
          return {
            content: [{
              type: "text",
              text: `Error: Could not find a valid state ID for "${args.status}" in team of issue ${args.id}`,
            }],
          };
        }
      }
      
      // Update the issue
      const updateIssueResponse = await enhancedClient.safeUpdateIssue(args.id, {
        title: args.title,
        description: args.description,
        trashed: args.trashed,
        dueDate: args.dueDate,
        sortOrder: args.sortOrder,
        stateId: stateId,
        priority: priorityValue,
        parentId: args.parentId,
      });
      
      if (!updateIssueResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to update issue. Please check your parameters and try again.",
          }],
        };
      }
      
      // Get issue ID from response
      // Linear SDK returns results in success and entity pattern
      if (updateIssueResponse.success) {
        // Access issue and get ID with the correct data type
        const response = updateIssueResponse?.data;
        if (response && response.issue && response.issue.id) {  
          return {
            content: [{
              type: "text",
              text: `Status: Success\nMessage: Linear issue updated\nIssue ID: ${issue.id}`,
            }],
          };
        }
      }
      
      // Extract data from response - fix to handle proper response structure
      const updateResponse = updateIssueResponse as unknown as IssueUpdateResponse;
      
      // Check if the response follows the expected structure with success flag
      if (updateResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to update issue. Please check your parameters and try again.",
          }],
        };
      }
      
      // Extract issue data from the correct property
      const issueData: Issue = 
        (updateResponse.issueUpdate && updateResponse.issueUpdate.issue) || 
        (updateIssueResponse as unknown as Issue);
      
      // Directly check the parsed response result
      const issueId = issueData?.id || (updateIssueResponse as unknown as { id?: string })?.id;
      if (issueId) {
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear issue updated\nIssue ID: ${issueId}`,
          }],
        };
      }
      
      if (!issueData) {
        // Display success message even if data is incomplete
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear issue updated",
          }],
        };
      }
      
      if (!issueData.id) {
        // Issue data exists but no ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear issue updated (ID not available)",
          }],
        };
      }
      
      // Success case with ID available
      if (issueData.title === undefined && issueData.description === undefined) {
        // Only ID is available, without complete data
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear issue updated\nIssue ID: ${issueData.id}`,
          }],
        };
      }
      
      
      // Return formatted text
      return {
        content: [{
          type: "text",
          text: `Status: Success\nMessage: Linear issue updated\nIssue ID: ${issueData.id}`,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while updating the issue:\n${errorMessage}`,
        }],
      };
    }
  },
}); 