import { z } from "zod";
import { Issue, IssueLabel } from '../../generated/linear-types.js';
import linearClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';

/**
 * Format the result of applying labels to human-readable text
 * @param issue The updated issue
 * @param appliedLabelIds IDs of the labels that were applied
 * @returns Formatted text for human readability
 */
function formatApplyLabelsResult(issue: Issue, appliedLabelIds: string[]): string {
  if (!issue || !issue.id) {
    return "Invalid or incomplete issue data";
  }

  let result = "LABELS APPLIED TO LINEAR ISSUE\n";
  result += "============================\n\n";
  
  // Basic issue information
  result += `--- ISSUE DETAILS ---\n`;
  result += `ID: ${issue.id}\n`;
  result += `TITLE: ${safeText(issue.title)}\n\n`;
  
  // Labels information
  result += `--- LABELS APPLIED ---\n`;
  result += `Number of labels applied: ${appliedLabelIds.length}\n`;
  
  // Display current labels
  if (issue.labels && issue.labels.nodes) {
    const totalLabels = issue.labels.nodes.length;
    result += `Total labels on issue: ${totalLabels}\n\n`;
    
    if (totalLabels > 0) {
      result += `--- CURRENT LABELS ---\n`;
      issue.labels.nodes.forEach((label: IssueLabel, index: number) => {
        const isNewlyApplied = appliedLabelIds.includes(label.id);
        result += `${index + 1}. ${safeText(label.name)} (${safeText(label.color)})${isNewlyApplied ? ' [newly applied]' : ''}\n`;
      });
      result += '\n';
    }
  } else {
    result += `Unable to retrieve current labels list.\n\n`;
  }
  
  result += "The labels have been successfully applied to the issue in Linear.";
  
  return result;
}

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
      const issue = await linearClient.issue(args.issueId);
      
      if (!issue) {
        return {
          content: [{
            type: "text",
            text: `Error: Issue with ID ${args.issueId} not found`,
          }],
        };
      }
      
      // Retrieve current labels
      const existingLabelsResult = await issue.labels();
      const existingLabelIds = existingLabelsResult ? 
        existingLabelsResult.nodes.map(label => label.id) : 
        [];
      
      // Combine existing labels with new labels, removing duplicates
      const combinedLabelIds = [...new Set([...existingLabelIds, ...args.labelIds])];
      
      // Update the issue with the combined labels
      const updateResponse = await linearClient.updateIssue(args.issueId, {
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
      
      // Get the updated issue with its labels
      const updatedIssue = await linearClient.issue(args.issueId);
      const updatedLabelsResult = await updatedIssue.labels();
      
      // Convert the issue and labels to the expected types
      const issueData: Issue = {
        id: updatedIssue.id,
        title: updatedIssue.title,
        labels: {
          nodes: updatedLabelsResult ? updatedLabelsResult.nodes : []
        }
      } as unknown as Issue;
      
      // Format the result for human readability
      const formattedResult = formatApplyLabelsResult(issueData, args.labelIds);
      
      return {
        content: [{
          type: "text",
          text: formattedResult,
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