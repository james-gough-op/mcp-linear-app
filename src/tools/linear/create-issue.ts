import { LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { getStateId, normalizeStateName } from '../../libs/utils.js';

// Create a logger specific to this component
const logger = createLogger('CreateIssue');

// Define string mappings for the priorities using SDK enum values
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0, // None
  'urgent': 1,      // Urgent
  'high': 2,        // High
  'medium': 3,      // Medium
  'low': 4         // Low
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
    "triage", 
    "backlog", 
    "todo", 
    "in_progress", 
    "done", 
    "canceled"
  ]).default("backlog").describe("The status of the issue"),
  priority: z.enum([
    "no_priority", "urgent", "high", "medium", "low"
  ]).default("no_priority").describe("The priority of the issue"),
  parentId: z.string().describe("The ID of the parent issue, used to create a sub-issue").optional(),
  projectId: LinearIdSchema.optional().describe("The ID of the project to assign the issue to"),
  cycleId: LinearIdSchema.optional().describe("The ID of the cycle to assign the issue to"),
  templateId: LinearIdSchema.optional().describe("The ID of the template to use for the issue")
});

type ValidatedIssueInput = z.infer<typeof createIssueSchema>;

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearCreateIssueTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "create_issue",
    description: "A tool that creates an issue in Linear",
    schema: createIssueSchema.shape,
    handler: async (args, options) => {
      try {
        // Zod validation
        const parseResult = createIssueSchema.safeParse(args);
        if (!parseResult.success) {
          const firstError = parseResult.error.errors[0];
          return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
        }
        const validatedArgs = parseResult.data;
        logger.info('Creating new issue', { 
          teamId: validatedArgs.teamId,
          title: validatedArgs.title,
          status: validatedArgs.status,
          priority: validatedArgs.priority
        });

        // Convert priority from string to number if provided
        let priorityValue: number | undefined;
        if (validatedArgs.priority) {
          priorityValue = PriorityStringToNumber[validatedArgs.priority];
          logger.debug('Converted priority string to number', { 
            priorityString: validatedArgs.priority, 
            priorityValue 
          });
        }

        // Get valid state ID from Linear API if status is provided
        let stateId: string | undefined;
        if (validatedArgs.status) {
          const normalizedStateName = normalizeStateName(validatedArgs.status);
          logger.debug('Getting state ID for status', { 
            status: validatedArgs.status, 
            normalizedStateName,
            teamId: validatedArgs.teamId
          });
          
          stateId = await getStateId(normalizedStateName, validatedArgs.teamId);
          if (!stateId) {
            logger.warn('Could not find valid state', {
              status: validatedArgs.status,
              teamId: validatedArgs.teamId
            });
            return formatValidationError(
              "status", 
              `Could not find a valid state "${validatedArgs.status}" in team ${validatedArgs.teamId}`
            );
          }
          logger.debug('Found state ID', { stateId });
        }

        // Map our validated input to LinearDocument.IssueCreateInput
        const issueInput: LinearDocument.IssueCreateInput = {
          title: validatedArgs.title,
          description: validatedArgs.description,
          stateId: stateId,
          dueDate: validatedArgs.dueDate,
          priority: priorityValue,
          teamId: validatedArgs.teamId,
          parentId: validatedArgs.parentId,
          projectId: validatedArgs.projectId,
          cycleId: validatedArgs.cycleId,
          templateId: validatedArgs.templateId,
        };
        
        logger.debug('Prepared issue input', { 
          input: {
            ...issueInput,
            description: issueInput.description?.length 
          }
        });

        // Create the issue using the enhanced client's safe method
        logger.logApiRequest('POST', 'issues', issueInput);
        const createIssueResult = await enhancedClient.safeCreateIssue(issueInput);

        // Check for error messages on both top-level and nested data.error
        let nestedErrorMsg = '';
        if (createIssueResult.data && typeof createIssueResult.data === 'object' && 'error' in createIssueResult.data) {
          const err = (createIssueResult.data as any).error;
          if (err && typeof err === 'object' && 'message' in err) {
            nestedErrorMsg = err.message;
          }
        }
        const errorMsg = createIssueResult.error?.message || nestedErrorMsg || '';
        if (errorMsg) {
          if (errorMsg.includes('Team ID is required')) {
            return formatValidationError('teamId', 'Team ID cannot be empty', true);
          }
          if (errorMsg.includes('Title is required')) {
            return formatValidationError('title', 'Issue title cannot be empty', true);
          }
          return formatErrorResponse(createIssueResult.error);
        }
        // Handle error if not successful or data missing
        if (!createIssueResult.success || !createIssueResult.data) {
          return formatErrorResponse(createIssueResult.error);
        }
        if (createIssueResult.success) {
          const payload = createIssueResult.data;
          if (typeof payload !== 'object' || payload === null) {
            return formatErrorResponse(new Error('Issue creation response missing data.') as any);
          }
          if (payload && payload.issue) {
            // Get the issue data - need to await it since SDK returns a promise
            const issue = await payload.issue;
            logger.debug('Full issue object for error inspection', { issue });
            // Check for error on the issue object itself
            if (issue && typeof issue === 'object') {
              let issueErrorMsg = '';
              if ('error' in issue && issue.error && typeof issue.error === 'object' && 'message' in issue.error) {
                issueErrorMsg = String(issue.error.message);
              } else if ('message' in issue && typeof issue.message === 'string' && issue.message.trim() && (!('title' in issue) || issue.message !== issue.title)) {
                issueErrorMsg = issue.message;
              }
              if (issueErrorMsg) {
                if (issueErrorMsg.includes('Team ID is required')) {
                  return formatValidationError('teamId', 'Team ID cannot be empty');
                }
                if (issueErrorMsg.includes('Title is required')) {
                  return formatValidationError('title', 'Issue title cannot be empty');
                }
                return formatErrorResponse(new Error(issueErrorMsg) as any);
              }
            }
            logger.info('Issue created successfully', { 
              issueId: issue.id,
              identifier: issue.identifier,
              title: issue.title
            });
            const details = [];
            if (validatedArgs.projectId) details.push(`Assigned to Project ID: ${validatedArgs.projectId}`);
            if (validatedArgs.cycleId) details.push(`Assigned to Cycle ID: ${validatedArgs.cycleId}`);
            if (validatedArgs.templateId) details.push(`Template applied: ${validatedArgs.templateId}`);
            return formatSuccessResponse("created", "issue", details.length > 0 ? details.join(', ') : `ID: ${issue.id}`);
          } else {
            // Otherwise, treat as minimal success
            return formatSuccessResponse("created", "issue");
          }
        }
        // Fallback (should not be reached)
        return formatErrorResponse(new Error('Unknown handler state.') as any);
      } catch (err) {
        logger.error('Unexpected error creating issue', { error: err instanceof Error ? err.message : String(err), ...args });
        return formatCatchErrorResponse(err);
      }
    },
  });
}

// Default export for production usage
export const LinearCreateIssueTool = createLinearCreateIssueTool();