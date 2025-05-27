import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";

// Create a logger specific to this component
const logger = createLogger('AddIssueToCycle');

/**
 * Define schema with Zod for adding an issue to a cycle
 */
const addIssueToCycleSchema = z.object({
  issueId: LinearIdSchema.describe("The ID of the issue to add to a cycle"),
  cycleId: LinearIdSchema.describe("The ID of the cycle to add the issue to")
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedAddIssueToCycleInput = z.infer<typeof addIssueToCycleSchema>;

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearAddIssueToCycleTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "add_issue_to_cycle",
    description: "Adds an existing Linear issue to a specific cycle",
    schema: addIssueToCycleSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = addIssueToCycleSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      try {
        logger.info('Adding issue to cycle', {
          issueId: validatedArgs.issueId,
          cycleId: validatedArgs.cycleId
        });
        
        // Use the safeAddIssueToCycle method from the enhanced client
        logger.logApiRequest('POST', `issues/${validatedArgs.issueId}/cycle`, { cycleId: validatedArgs.cycleId });
        const response = await enhancedClient.safeAddIssueToCycle(
          validatedArgs.issueId,
          validatedArgs.cycleId
        );

        // Check if the operation was successful
        if (!response.success || !response.data) {
          logger.error('Failed to add issue to cycle', { 
            error: response.error?.message 
          });
          return formatErrorResponse(response.error);
        }

        // Extract data from response
        const issueUpdatePayload = response.data;
        logger.debug('Received response payload', { success: issueUpdatePayload.success });

        // Format and return response
        if (issueUpdatePayload.success && issueUpdatePayload.issue) {
          // Get the issue data - need to await it since SDK returns a promise
          logger.debug('Fetching updated issue data');
          const updatedIssue = await issueUpdatePayload.issue;
          
          let cycleName = "Unknown Cycle";
          let cycleNumber: number | undefined = undefined;
          
          // Extract cycle information if available - need to await it since it's a promise
          if (updatedIssue.cycle) {
            logger.debug('Fetching cycle information');
            try {
              const cycleData = await updatedIssue.cycle;
              cycleName = cycleData.name || "Unknown Cycle";
              cycleNumber = cycleData.number;
              logger.debug('Cycle information retrieved', { cycleName, cycleNumber });
            } catch (error) {
              logger.warn('Failed to fetch cycle details', {
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          
          // Get issue identifier
          const identifier = updatedIssue.identifier || updatedIssue.id;
          logger.info('Successfully added issue to cycle', {
            issueId: validatedArgs.issueId,
            issueIdentifier: identifier,
            cycleId: validatedArgs.cycleId,
            cycleName
          });

          const details = `issue \"${updatedIssue.title}\" (${identifier}) to cycle ${cycleNumber ? `#${cycleNumber} ` : ''}\"${cycleName}\" (ID: ${validatedArgs.cycleId})`;
          return formatSuccessResponse("added", "issue to cycle", details);
        }

        // Handle cases where the operation reports success but data structure is unexpected
        logger.warn('Unexpected response structure', { response: issueUpdatePayload });
        return formatErrorResponse(new Error('Failed to add issue to cycle. The operation may not have succeeded on Linear\'s side.') as any);
      } catch (error) {
        logger.error('Unexpected error adding issue to cycle', {
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedAddIssueToCycleInput).issueId,
          cycleId: (args as ValidatedAddIssueToCycleInput).cycleId
        });
        return formatCatchErrorResponse(error);
      }
    },
  });
}

// Default export for production usage
export const LinearAddIssueToCycleTool = createLinearAddIssueToCycleTool();