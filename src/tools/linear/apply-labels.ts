import { LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse } from '../../libs/error-utils.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";

// Create a logger specific to this component
const logger = createLogger('ApplyLabels');

/**
 * Apply labels tool schema definition
 */
const applyLabelsSchema = z.object({
  issueId: LinearIdSchema.describe("The ID of the issue to apply labels to"),
  labelIds: z.array(LinearIdSchema)
    .min(1, "At least one label ID must be provided")
    .describe("Array of label IDs to apply to the issue")
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedLabelsInput = z.infer<typeof applyLabelsSchema>;

/**
 * Type for issue labels query response
 */
interface IssueLabelsResponse {
  issue: {
    labels: {
      nodes: {
        id: string;
      }[];
    };
  };
}

/**
 * Factory to create the tool with a provided client (for DI/testing)
 */
export function createLinearApplyLabelsTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "apply_labels",
    description: "Applies one or more existing labels to a Linear issue",
    schema: applyLabelsSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      try {
        const validatedArgs = args as ValidatedLabelsInput;
        logger.info('Applying labels to issue', { 
          issueId: validatedArgs.issueId,
          labelCount: validatedArgs.labelIds.length,
          labelIds: validatedArgs.labelIds
        });
        
        // First, get the issue to retrieve its current labels
        logger.debug('Verifying issue exists');
        logger.logApiRequest('GET', `issue/${validatedArgs.issueId}`, {});
        const issueResult = await enhancedClient.safeGetIssue(validatedArgs.issueId);

        if (!issueResult.success || !issueResult.data) {
          logger.error('Issue not found', { 
            issueId: validatedArgs.issueId,
            error: issueResult.error?.message 
          });
          return formatErrorResponse(issueResult.error);
        }

        // Get the current label IDs using the GraphQL API
        // Note: We use GraphQL directly here because accessing issue.labels can be tricky with the SDK
        logger.debug('Fetching current labels for issue');
        const labelsQuery = `
          query GetIssueLabels($issueId: String!) {
            issue(id: $issueId) {
              labels {
                nodes {
                  id
                }
              }
            }
          }
        `;

        logger.logApiRequest('POST', 'graphql', { 
          query: 'GetIssueLabels',
          variables: { issueId: validatedArgs.issueId } 
        });
        const labelsResult = await enhancedClient.safeExecuteGraphQLQuery<IssueLabelsResponse>(
          labelsQuery, 
          { issueId: validatedArgs.issueId }
        );
        
        // Get existing label IDs
        const existingLabelIds = labelsResult.success && labelsResult.data?.issue?.labels?.nodes
          ? labelsResult.data.issue.labels.nodes.map(label => label.id)
          : [];
        
        logger.debug('Retrieved existing labels', { 
          existingLabelCount: existingLabelIds.length,
          existingLabelIds 
        });
        
        // Combine existing labels with new labels, removing duplicates
        const combinedLabelIds = [...new Set([...existingLabelIds, ...validatedArgs.labelIds])];
        logger.debug('Combined labels', { 
          combinedLabelCount: combinedLabelIds.length,
          newLabelIds: validatedArgs.labelIds 
        });

        // Update the issue with the combined labels using SDK types
        const updateInput: LinearDocument.IssueUpdateInput = {
          labelIds: combinedLabelIds,
        };
        
        // Update the issue with the combined labels
        logger.logApiRequest('PATCH', `issue/${validatedArgs.issueId}`, { labelIds: combinedLabelIds });
        const updateResponse = await enhancedClient.safeUpdateIssue(validatedArgs.issueId, updateInput);

        if (!updateResponse || !updateResponse.success) {
          logger.error('Failed to apply labels', { 
            issueId: validatedArgs.issueId,
            error: updateResponse?.error?.message 
          });
          return formatErrorResponse(updateResponse?.error);
        }

        logger.info('Labels applied successfully', { 
          issueId: validatedArgs.issueId,
          appliedLabelIds: validatedArgs.labelIds 
        });
        return formatSuccessResponse('applied', 'labels', `${validatedArgs.labelIds.length} labels to issue ${validatedArgs.issueId}`);
      } catch (error) {
        logger.error('Unexpected error applying labels', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedLabelsInput).issueId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearApplyLabelsTool = createLinearApplyLabelsTool();