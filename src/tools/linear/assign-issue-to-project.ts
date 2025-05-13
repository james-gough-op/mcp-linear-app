import { z } from "zod";
import { enhancedClient } from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';

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
 * Format the updated issue data into human-readable text
 * @param issue Updated issue data to format
 * @param projectId The ID of the project the issue was assigned to
 * @returns Formatted text for human readability
 */
function formatAssignmentResult(issue: any, projectId: string): string {
  if (!issue || !issue.id) {
    return "Invalid or incomplete issue data";
  }

  let result = "ISSUE ASSIGNED TO PROJECT\n";
  result += "=========================\n\n";
  
  // Basic issue information
  result += `--- ISSUE DETAILS ---\n`;
  result += `ID: ${issue.id}\n`;
  
  if (issue.identifier) {
    result += `IDENTIFIER: ${issue.identifier}\n`;
  }
  
  result += `TITLE: ${safeText(issue.title)}\n\n`;
  
  // Project information
  result += `--- PROJECT DETAILS ---\n`;
  result += `PROJECT ID: ${projectId}\n`;
  
  if (issue.project) {
    result += `PROJECT NAME: ${safeText(issue.project.name)}\n`;
  }
  
  result += "\nThe issue has been successfully assigned to the project in Linear.";
  
  return result;
}

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
      const response = await enhancedClient.executeGraphQLMutation<IssueUpdateResponse>(
        ASSIGN_ISSUE_TO_PROJECT_MUTATION,
        {
          issueId: args.issueId,
          projectId: args.projectId
        }
      );
      
      // Format and return response
      if (response.data?.issueUpdate?.success) {
        const updatedIssue = response.data.issueUpdate.issue;
        
        return {
          content: [{
            type: "text",
            text: formatAssignmentResult(updatedIssue, args.projectId)
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