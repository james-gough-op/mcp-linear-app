import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * GraphQL mutation for assigning an issue to a project
 */
const ASSIGN_ISSUE_TO_PROJECT_MUTATION = `
  mutation AssignIssueToProject($issueId: String!, $projectId: String!) {
    issueUpdate(
      id: $issueId,
      input: {
        projectId: $projectId
      }
    ) {
      success
      issue {
        id
        identifier
        title
        project {
          id
          name
        }
      }
    }
  }
`;

/**
 * Type definition for the issue update response
 */
interface IssueUpdateResponse {
  issueUpdate: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      title: string;
      project?: {
        id: string;
        name: string;
      };
    };
  };
}

/**
 * Schema for assign issue to project input parameters
 */
const assignIssueToProjectSchema = z.object({
  issueId: LinearIdSchema.describe("The ID of the issue to assign to a project"),
  projectId: LinearIdSchema.describe("The ID of the project to assign the issue to")
});

/**
 * Assign Issue to Project tool implementation
 */
export const LinearAssignIssueToProjectTool = createSafeTool({
  name: "mcp_linear_assign_issue_to_project",
  description: "Assigns an existing Linear issue to a Linear project",
  schema: assignIssueToProjectSchema.shape,
  handler: async (args: z.infer<typeof assignIssueToProjectSchema>) => {
    try {
      // Execute the GraphQL mutation
      const response = await enhancedClient.safeExecuteGraphQLMutation<IssueUpdateResponse>(
        ASSIGN_ISSUE_TO_PROJECT_MUTATION,
        {
          issueId: args.issueId,
          projectId: args.projectId
        }
      );

      // Check if the operation was successful
      if (!response.success || !response.data) {
        // Handle error case
        const errorMessage = response.error 
          ? response.error.message 
          : "Failed to assign issue to project. Please check your parameters and try again.";
        
        return {
          content: [{
            type: "text",
            text: `Error: ${errorMessage}`,
          }],
        };
      }

      // Extract the payload from the result
      const assignIssueToProjectResponse = response.data;
      
      // Format and return response
      if (assignIssueToProjectResponse.issueUpdate?.success) {
        const updatedIssue = assignIssueToProjectResponse.issueUpdate.issue;
        
        return {
          content: [{
            type: "text",
            text: `Successfully assigned issue "${updatedIssue.title}" (${updatedIssue.identifier}) to project "${updatedIssue.project?.name}" (ID: ${args.projectId}).`
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: "Failed to assign issue to project. Please check your parameters and try again."
        }]
      };
    } catch (error) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while assigning the issue to project: ${errorMessage}`
        }]
      };
    }
  }
}); 