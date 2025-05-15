import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * Define schema with Zod for adding an issue to a cycle
 */
const addIssueToCycleSchema = z.object({
  issueId: LinearIdSchema.describe("The ID of the issue to add to a cycle"),
  cycleId: LinearIdSchema.describe("The ID of the cycle to add the issue to")
});

/**
 * Interface for the update response
 */
interface IssueUpdateResponse {
  issueUpdate?: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      title: string;
      cycle?: {
        id: string;
        name: string;
        number?: number;
        startsAt?: string;
        endsAt?: string;
      };
    };
  };
}

/**
 * Define the GraphQL mutation for adding an issue to a cycle
 */
const ADD_ISSUE_TO_CYCLE_MUTATION = `
  mutation AddIssueToCycle($issueId: String!, $cycleId: String!) {
    issueUpdate(
      id: $issueId,
      input: {
        cycleId: $cycleId
      }
    ) {
      success
      issue {
        id
        identifier
        title
        cycle {
          id
          name
          number
          startsAt
          endsAt
        }
      }
    }
  }
`;

/**
 * Tool implementation for adding an issue to a cycle in Linear
 */
export const LinearAddIssueToCycleTool = createSafeTool({
  name: "add_issue_to_cycle",
  description: "Adds an existing Linear issue to a specific cycle",
  schema: addIssueToCycleSchema.shape,
  handler: async (args) => {
    try {
      // Validate input parameters
      if (!args.issueId) {
        return {
          content: [{
            type: "text",
            text: "Validation error: issueId: Invalid Linear ID format. Linear IDs must be valid UUID v4 strings.",
          }],
        };
      }
      
      if (!args.cycleId) {
        return {
          content: [{
            type: "text",
            text: "Validation error: cycleId: Invalid Linear ID format. Linear IDs must be valid UUID v4 strings.",
          }],
        };
      }
      
      // Validate IDs using LinearIdSchema
      try {
        LinearIdSchema.parse(args.issueId);
        LinearIdSchema.parse(args.cycleId);
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Validation error: ${error instanceof Error ? error.message : 'IDs must be valid Linear ID format'}`,
          }],
        };
      }
      
      // Execute the mutation by using the enhanced client's mutation method
      const response = await enhancedClient.executeGraphQLMutation<IssueUpdateResponse>(
        ADD_ISSUE_TO_CYCLE_MUTATION,
        {
          issueId: args.issueId,
          cycleId: args.cycleId,
        }
      );
      
      // Extract data from response with proper typing
      const data = response.data as IssueUpdateResponse;
      
      // Format and return response
      if (data?.issueUpdate?.success) {
        const updatedIssue = data.issueUpdate.issue;
        const cycleName = updatedIssue.cycle?.name || "Unknown Cycle";
        const cycleNumber = updatedIssue.cycle?.number || "";
        
        return {
          content: [{
            type: "text",
            text: `Successfully added issue "${updatedIssue.title}" (${updatedIssue.identifier}) to cycle ${cycleNumber ? `#${cycleNumber}` : ''} "${cycleName}" (ID: ${args.cycleId}).`,
          }],
        };
      }
      
      return {
        content: [{
          type: "text",
          text: "Failed to add issue to cycle. Please check your parameters and try again."
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while adding the issue to cycle:\n${errorMessage}`,
        }],
      };
    }
  },
}); 