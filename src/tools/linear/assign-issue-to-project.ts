import { LinearDocument, LinearErrorType } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearError } from '../../libs/errors.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from "../../libs/utils.js";

// Create a logger specific to this component
const logger = createLogger('AssignIssueToProject');

/**
 * Schema for assign issue to project input parameters
 */
const assignIssueToProjectSchema = z.object({
  issueId: LinearIdSchema.describe("The ID of the issue to assign to a project"),
  projectId: LinearIdSchema.describe("The ID of the project to assign the issue to")
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedAssignIssueInput = z.infer<typeof assignIssueToProjectSchema>;

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearAssignIssueToProjectTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "mcp_linear_assign_issue_to_project",
    description: "Assigns an existing Linear issue to a Linear project",
    schema: assignIssueToProjectSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = assignIssueToProjectSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      try {
        logger.info('Assigning issue to project', {
          issueId: validatedArgs.issueId,
          projectId: validatedArgs.projectId
        });
        
        // Create the input for the issue update
        const updateInput: LinearDocument.IssueUpdateInput = {
          projectId: validatedArgs.projectId
        };
        
        // Use the safeUpdateIssue method from the enhanced client
        logger.debug('Preparing to update issue');
        logger.logApiRequest('PATCH', `issue/${validatedArgs.issueId}`, { projectId: validatedArgs.projectId });
        const response = await enhancedClient.safeUpdateIssue(
          validatedArgs.issueId,
          updateInput
        );

        // Check if the operation was successful
        if (!response.success || !response.data) {
          logger.error('Failed to assign issue to project', { 
            error: response.error?.message 
          });
          return formatErrorResponse(response.error);
        }

        // Extract the payload from the result
        const issueUpdatePayload = response.data;
        logger.debug('Received update response', { success: issueUpdatePayload.success });
        
        // Format and return response
        if (issueUpdatePayload.success && issueUpdatePayload.issue) {
          // Get the issue data - need to await it since SDK returns a promise
          logger.debug('Fetching updated issue data');
          const updatedIssue = await issueUpdatePayload.issue;
          
          // Get project information if available
          let projectName = "Unknown Project";
          if (updatedIssue.project) {
            logger.debug('Fetching project information');
            try {
              const projectData = await updatedIssue.project;
              projectName = projectData.name || "Unknown Project";
              logger.debug('Project information retrieved', { projectName });
            } catch (error) {
              logger.warn('Failed to fetch project details', {
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          
          logger.info('Successfully assigned issue to project', {
            issueId: validatedArgs.issueId,
            issueIdentifier: updatedIssue.identifier,
            projectId: validatedArgs.projectId,
            projectName
          });
          
          const details = `issue ${safeText(updatedIssue.title)} (${updatedIssue.identifier}) to project ${safeText(projectName)} (ID: ${validatedArgs.projectId})`;
          return formatSuccessResponse("assigned", "issue to project", details);
        }
        
        logger.warn('Unexpected response structure', { response: issueUpdatePayload });
        return formatErrorResponse(
          new LinearError(
            "Failed to assign issue to project. The operation may not have succeeded on Linear's side.",
            "Unknown" as LinearErrorType
          )
        );
      } catch (error) {
        logger.error('Unexpected error assigning issue to project', {
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedAssignIssueInput).issueId,
          projectId: (args as ValidatedAssignIssueInput).projectId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearAssignIssueToProjectTool = createLinearAssignIssueToProjectTool();