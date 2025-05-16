import { z } from "zod";

import { Comment, User, WorkflowState } from "@linear/sdk";
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * Schema definition for the get issue tool
 * Defines the required parameters to retrieve an issue
 */
const getIssueSchema = z.object({
  issueId: z.string().describe("The ID of the issue to retrieve"),
});

/**
 * Interface for sub-issue object
 */
interface SubIssueData {
  id: string;
  title: string;
  priority: number;
  status: WorkflowState | null;
}

/**
 * Tool implementation for retrieving a Linear issue by its ID
 * 
 * This tool fetches a specific issue from Linear along with its comments.
 * It provides detailed information about the issue including its metadata
 * and all associated comments with their authors.
 * 
 * Error handling is managed automatically by the createSafeTool wrapper.
 */
export const LinearGetIssueTool = createSafeTool({
  name: "get_issue",
  description: "A tool that gets an issue from Linear",
  schema: getIssueSchema.shape,
  handler: async (args: z.infer<typeof getIssueSchema>) => {
    try {
      // Validate input ID
      if (!args.issueId || args.issueId.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Issue ID cannot be empty",
          }],
        };
      }
      
      // Fetch the issue using the enhanced client
      const issueResult = await enhancedClient.safeGetIssue(args.issueId);
      
      // Return an error message if the issue doesn't exist
      if (!issueResult.success || !issueResult.data) {
        return {
          content: [{
            type: "text",
            text: "Issue not found with that ID.",
          }],
        };
      }
      
      const issue = issueResult.data;
      
      // Safely fetch comments with error handling
      let comments: Comment[] = [];
      try {
        const commentsResult = await enhancedClient.safeGetIssueComments(args.issueId);
        if (commentsResult.success && commentsResult.data) {
          comments = commentsResult.data.nodes.map(comment => {
            return {
              id: comment.id || "unknown-id",
              body: comment.body || "",
              createdAt: comment.createdAt || new Date().toISOString(),
              updatedAt: comment.updatedAt || new Date().toISOString(),
              user: comment.user ? comment.user as unknown as User : null,
            } as unknown as Comment;
          });
        }
      } catch (error) {
        // Fail gracefully if comments can't be loaded
        comments = [{
          id: "comments-error",
          body: "Could not load comments: server error",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null
        } as unknown as Comment];
      }

      // Extract state information from the issue object
      let status: WorkflowState | null = null;
      if (issue.state) {
        status = {
          id: issue.state.id || "unknown-id",
          name: issue.state.name || "Unknown status",
          color: issue.state.color || "#cccccc",
          type: issue.state.type || "unknown",
        } as WorkflowState;
      }
      
      // Extract sub-issues from the issue object
      let subIssues: SubIssueData[] = [];
      if (issue.children && issue.children.nodes) {
        subIssues = issue.children.nodes.map(childIssue => {
          const subIssueStatus = childIssue.state ? {
            id: childIssue.state.id || "unknown-id",
            name: childIssue.state.name || "Unknown status",
            color: childIssue.state.color || "#cccccc",
            type: childIssue.state.type || "unknown",
          } as WorkflowState : null;
          
          return {
            id: childIssue.id || "unknown-id",
            title: childIssue.title || "No title",
            priority: typeof childIssue.priority === 'number' ? childIssue.priority : 0,
            status: subIssueStatus
          };
        });
      }
      
      
      // Return the formatted text
      return {
        content: [{
          type: "text",
          text: `Issue ID: ${issue.id}\nTitle: ${issue.title}\nDescription: ${issue.description}\nStatus: ${status?.name}\nSub-issues: ${subIssues.length}`,
        }],
      };
    } catch (error) {
      // Handle unexpected errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while retrieving issue data:\n${errorMessage}`,
        }],
      };
    }
  }
}); 