import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";


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
 * Tool implementation for applying labels to an issue in Linear
 * This tool adds the specified labels to an issue while preserving existing labels
 */
export const LinearApplyLabelsTool = createSafeTool({
  name: "apply_labels",
  description: "Applies one or more existing labels to a Linear issue",
  schema: applyLabelsSchema.shape,
  handler: async (args: z.infer<typeof applyLabelsSchema>) => {
    try {
      // Validate input
      if (!args.issueId || args.issueId.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Issue ID cannot be empty",
          }],
        };
      }
      
      if (!args.labelIds || args.labelIds.length === 0) {
        return {
          content: [{
            type: "text",
            text: "Error: At least one label ID must be provided",
          }],
        };
      }
      
      // First, get the issue to retrieve its current labels
      const issue = await enhancedClient.safeGetIssue(args.issueId);
      
      if (!issue) {
        return {
          content: [{
            type: "text",
            text: `Error: Issue with ID ${args.issueId} not found`,
          }],
        };
      }
      
      // Query for the issue labels
      const labelsQuery = `
        query GetIssueLabels($issueId: String!) {
          issue(id: $issueId) {
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      `;
      
      // Define the return type for our query
      type IssueLabelsResponse = {
        issue: {
          labels: {
            nodes: {
              id: string;
              name: string;
              color: string;
            }[];
          };
        };
      };
      
      const labelsResult = await enhancedClient.safeExecuteGraphQLQuery<IssueLabelsResponse>(labelsQuery, { issueId: args.issueId });
      
      // Get existing label IDs
      const existingLabelIds = labelsResult.success && labelsResult.data?.issue?.labels?.nodes
        ? labelsResult.data.issue.labels.nodes.map(label => label.id)
        : [];
      
      // Combine existing labels with new labels, removing duplicates
      const combinedLabelIds = [...new Set([...existingLabelIds, ...args.labelIds])];
      
      // Update the issue with the combined labels
      const updateResponse = await enhancedClient.safeUpdateIssue(args.issueId, {
        labelIds: combinedLabelIds,
      });
      
      if (!updateResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to apply labels to the issue. Please check your parameters and try again.",
          }],
        };
      }
                  
      return {
        content: [{
          type: "text",
          text: "Status: Success\nMessage: Linear label applied",
        }],
      };
    } catch (error) {
      // Error handling - show user-friendly message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while applying labels to the issue: ${errorMessage}`
        }]
      };
    }
  }
}); 