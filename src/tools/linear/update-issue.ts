import { LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { getStateId, normalizeStateName } from '../../libs/utils.js';

// Create a logger specific to this component
const logger = createLogger('UpdateIssue');

// Define string mappings for the priorities using SDK enum values
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0, // None
  'urgent': 1,      // Urgent
  'high': 2,        // High
  'medium': 3,      // Medium
  'low': 4          // Low
};

const updateIssueSchema = z.object({
  id: z.string().min(1, "Issue ID cannot be empty").describe("The ID of the issue to update"),
  title: z.string().optional().describe("The new title for the issue"),
  description: z.string().optional().describe("The new description for the issue"),
  dueDate: z.string().datetime({message: "Invalid datetime string. Must be UTC ISO 8601."}).optional().describe("The new due date (UTC ISO 8601 format)"),
  status: z.enum(["triage", "backlog", "todo", "in_progress", "done", "canceled"]).optional().describe("The new status for the issue"),
  priority: z.enum(["no_priority", "urgent", "high", "medium", "low"] as const).optional().describe("The new priority for the issue"),
  sortOrder: z.number().optional().describe("The new sort order for the issue"),
  trashed: z.boolean().optional().describe("Whether the issue should be trashed"),
  parentId: z.string().optional().describe("The ID of the new parent issue"),
});

type ValidatedIssueInput = z.infer<typeof updateIssueSchema>;

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearUpdateIssueTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "update_issue",
    description: "Updates an existing issue in Linear.",
    schema: updateIssueSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      try {
        // Zod validation
        const parseResult = updateIssueSchema.safeParse(args);
        if (!parseResult.success) {
          const firstError = parseResult.error.errors[0];
          return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
        }
        const validatedArgs = parseResult.data;

        logger.info('Starting issue update', { issueId: validatedArgs.id });
        const {id, status, priority: priorityString, ...otherValidatedArgs} = validatedArgs as ValidatedIssueInput;

        // Create the update payload using SDK type
        const finalUpdatePayload: Partial<LinearDocument.IssueUpdateInput> = {...otherValidatedArgs};

        // Map priority string to number value if provided
        if (priorityString) {
          finalUpdatePayload.priority = PriorityStringToNumber[priorityString];
          logger.debug('Mapped priority string to number', { 
            priorityString, 
            priorityNumber: finalUpdatePayload.priority 
          });
        }

        // Handle status conversion to stateId
        if (status) {
          logger.debug('Converting status to stateId', { status });
          const issueForTeamResult = await enhancedClient.safeGetIssue(id);
          
          if (!issueForTeamResult.success || !issueForTeamResult.data) {
            logger.error('Issue not found', { 
              issueId: id, 
              error: issueForTeamResult.error?.message 
            });
            return formatErrorResponse(issueForTeamResult.error);
          }
          
          const team = await issueForTeamResult.data.team;
          if (!team?.id) {
            logger.error('Could not find team ID for issue', { issueId: id });
            return formatValidationError(
              'status', 
              `Could not find team ID for issue ${id} to update status`
            );
          }
          
          const normalizedStateName = normalizeStateName(status);
          const stateIdToUpdate = await getStateId(normalizedStateName, team.id);
          
          if (!stateIdToUpdate) {
            logger.error('Could not find state ID for status', { 
              status, 
              teamId: team.id 
            });
            return formatValidationError(
              'status', 
              `Could not find a valid state for "${status}" in team ${team.id}`
            );
          }
          
          finalUpdatePayload.stateId = stateIdToUpdate;
          logger.debug('Status converted to stateId', { 
            status, 
            stateId: stateIdToUpdate 
          });
        }

        // Remove any undefined properties from the payload
        (Object.keys(finalUpdatePayload) as Array<keyof Partial<LinearDocument.IssueUpdateInput>>).forEach(key => {
          if (finalUpdatePayload[key] === undefined) {
            delete finalUpdatePayload[key];
          }
        });

        logger.debug('Prepared update payload', { issueId: id, payload: finalUpdatePayload });

        // Call the Linear API to update the issue
        logger.info('Calling Linear API to update issue', { issueId: id });
        const updateResult = await enhancedClient.safeUpdateIssue(id, finalUpdatePayload as LinearDocument.IssueUpdateInput);

        if (!updateResult.success || !updateResult.data || !updateResult.data.issue) {
          logger.error('Failed to update issue', { 
            issueId: id, 
            error: updateResult.error?.message 
          });
          return formatErrorResponse(updateResult.error);
        }

        const updatedIssue = await updateResult.data.issue;
        logger.info('Issue updated successfully', { issueId: updatedIssue.id });
        
        // Collect updated fields for detailed response
        const updatedFields = Object.keys(finalUpdatePayload).join(', ');
        return formatSuccessResponse("updated", "issue", `ID: ${updatedIssue.id}, updated fields: ${updatedFields}`);

      } catch (error) {
        logger.error('Unexpected error updating issue', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedIssueInput).id
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearUpdateIssueTool = createLinearUpdateIssueTool();