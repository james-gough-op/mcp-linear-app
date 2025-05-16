import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { getStateId, normalizeStateName } from '../../libs/utils.js';

/**
 * Linear issue state constants
 */
export const LINEAR_ISSUE_STATES = {
  TRIAGE: "triage",
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELED: "canceled"
} as const;

export type LinearIssueStateType = typeof LINEAR_ISSUE_STATES[keyof typeof LINEAR_ISSUE_STATES];

/**
 * Linear issue priority constants
 * 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
 */
export const LINEAR_ISSUE_PRIORITIES = {
  NO_PRIORITY: 0,
  URGENT: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
} as const;

export type LinearIssuePriorityType = typeof LINEAR_ISSUE_PRIORITIES[keyof typeof LINEAR_ISSUE_PRIORITIES];

// Define string mappings for the priorities
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': LINEAR_ISSUE_PRIORITIES.NO_PRIORITY,
  'urgent': LINEAR_ISSUE_PRIORITIES.URGENT,
  'high': LINEAR_ISSUE_PRIORITIES.HIGH,
  'medium': LINEAR_ISSUE_PRIORITIES.MEDIUM,
  'low': LINEAR_ISSUE_PRIORITIES.LOW
};


/**
 * Create issue tool schema definition
 */
const createIssueSchema = z.object({
  teamId: z.string().describe("The team ID the issue belongs to"),
  title: z.string().describe("The title of the issue"),
  description: z.string().describe("The description of the issue"),
  dueDate: z.string().describe("The due date of the issue").optional(),
  status: z.enum([
    LINEAR_ISSUE_STATES.TRIAGE, 
    LINEAR_ISSUE_STATES.BACKLOG, 
    LINEAR_ISSUE_STATES.TODO, 
    LINEAR_ISSUE_STATES.IN_PROGRESS, 
    LINEAR_ISSUE_STATES.DONE, 
    LINEAR_ISSUE_STATES.CANCELED
  ]).default(LINEAR_ISSUE_STATES.BACKLOG).describe("The status of the issue"),
  priority: z.enum([
    "no_priority", "urgent", "high", "medium", "low"
  ]).default("no_priority").describe("The priority of the issue"),
  parentId: z.string().describe("The ID of the parent issue, used to create a sub-issue").optional(),
  projectId: LinearIdSchema.optional().describe("The ID of the project to assign the issue to"),
  cycleId: LinearIdSchema.optional().describe("The ID of the cycle to assign the issue to"),
  templateId: LinearIdSchema.optional().describe("The ID of the template to use for the issue")
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
      
      // Validate projectId if provided
      if (args.projectId) {
        try {
          LinearIdSchema.parse(args.projectId);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Validation error: projectId: ${error instanceof Error ? error.message : 'Project ID must be a valid Linear ID'}`,
            }],
          };
        }
      }

      // Validate cycleId if provided
      if (args.cycleId) {
        try {
          LinearIdSchema.parse(args.cycleId);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Validation error: cycleId: ${error instanceof Error ? error.message : 'Cycle ID must be a valid Linear ID'}`,
            }],
          };
        }
      }
      
      // Validate templateId if provided
      if (args.templateId) {
        try {
          LinearIdSchema.parse(args.templateId);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Validation error: templateId: ${error instanceof Error ? error.message : 'Template ID must be a valid Linear ID'}`,
            }],
          };
        }
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
        // Get the actual state ID from Linear API using enhancedClient
        stateId = await getStateId(normalizedStateName, args.teamId);
        
        if (!stateId) {
          return {
            content: [{
              type: "text",
              text: `Error: Could not find a valid state ID for "${args.status}" in team ${args.teamId}`,
            }],
          };
        }
      }

      // Create the issue using the enhanced client's safe method
      const createIssueResult = await enhancedClient.safeCreateIssue({
        title: args.title,
        description: args.description,
        stateId: stateId,
        dueDate: args.dueDate,
        priority: priorityValue,
        teamId: args.teamId,
        parentId: args.parentId,
        projectId: args.projectId,
        cycleId: args.cycleId,
        templateId: args.templateId,
      });
      
      // Check if the operation was successful
      if (!createIssueResult.success || !createIssueResult.data) {
        // Handle error case
        const errorMessage = createIssueResult.error 
          ? createIssueResult.error.message 
          : "Failed to create issue. Please check your parameters and try again.";
        
        return {
          content: [{
            type: "text",
            text: `Error: ${errorMessage}`,
          }],
        };
      }
      
      // Extract the issue payload from the result
      const createIssueResponse = createIssueResult.data;
      
      // Getting issue ID from response
      if (createIssueResponse.issue) {
        // Access issue and get ID with correct data type
        const issue = await createIssueResponse.issue;
        if (issue && issue.id) {
          // Include project, cycle, and template info in success message if available
          const additionalInfo = [];
          
          if (args.projectId) {
            additionalInfo.push(`Assigned to Project ID: ${args.projectId}`);
          }
          
          if (args.cycleId) {
            additionalInfo.push(`Assigned to Cycle ID: ${args.cycleId}`);
          }
          
          if (args.templateId) {
            additionalInfo.push(`Template applied: ${args.templateId}`);
          }
          
          const additionalInfoText = additionalInfo.length > 0 ? `\n${additionalInfo.join('\n')}` : '';
          
          return {
            content: [{
              type: "text",
              text: `Status: Success\nMessage: Linear issue created\nIssue ID: ${issue.id}${additionalInfoText}`,
            }],
          };
        }
      }
      
      // For cases where the issue field doesn't resolve properly
      if (createIssueResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to create issue. Please check your parameters and try again.",
          }],
        };
      }
      
      // Fallback for success case with minimal information
      return {
        content: [{
          type: "text",
          text: "Status: Success\nMessage: Linear issue created",
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