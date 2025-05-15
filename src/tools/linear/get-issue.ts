import { z } from "zod";
import { Comment, Issue, WorkflowState } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { formatDate, getPriorityLabel, safeText } from '../../libs/utils.js';

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
 * Format issue data to human readable text
 * Handles all edge cases with safe data processing
 * 
 * @param issue The issue data
 * @param comments The issue comments
 * @param status The status object
 * @param subIssues The sub-issues array
 * @returns Formatted human readable text
 */
function formatIssueToHumanReadable(
  issue: Issue, 
  comments: Comment[], 
  status: WorkflowState | null,
  subIssues: SubIssueData[]
): string {
  if (!issue || !issue.id) {
    return "Invalid or incomplete issue data";
  }
  
  // Build formatted output with simpler structure
  let result = "";
  
  // Basic issue information
  result += `Id: ${issue.id}\n`;
  result += `Title: ${safeText(issue.title)}\n`;
  result += `Description: ${safeText(issue.description, "No description")}\n`;
  
  // Status and priority
  result += `Status: ${status && status.name ? status.name : "Unknown"}\n`;
  result += `Priority: ${getPriorityLabel(issue.priority)}\n`;
  
  // Dates
  result += `Created: ${formatDate(issue.createdAt)}\n`;
  result += `Updated: ${formatDate(issue.updatedAt)}\n`;
  
  // Due date if present
  if (issue.dueDate) {
    result += `Due date: ${formatDate(issue.dueDate)}\n`;
  }
  
  // URL
  result += `Url: ${safeText(issue.url)}\n\n`;
  
  // Sub-issues section
  result += `Sub-issues (${subIssues ? subIssues.length : 0}):\n`;
  
  if (subIssues && subIssues.length > 0) {
    subIssues.forEach((subIssue, index) => {
      result += `#${index + 1}: ${safeText(subIssue.title)}\n`;
      result += `Status: ${subIssue.status && subIssue.status.name ? subIssue.status.name : "Unknown"}\n`;
      result += `Priority: ${getPriorityLabel(subIssue.priority)}\n\n`;
    });
  } else {
    result += "No sub-issues for this issue\n\n";
  }
  
  // Comments section
  result += `Comments (${comments ? comments.length : 0}):\n`;
  
  if (comments && comments.length > 0) {
    comments.forEach((comment, index) => {
      result += `Comment #${index + 1}: ${safeText(comment.body)}\n`;
      result += `Created: ${formatDate(comment.createdAt)}\n\n`;
    });
  } else {
    result += "No comments for this issue\n\n";
  }
  
  return result;
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
              user: comment.user ? {
                id: comment.user.id,
                name: comment.user.name,
                email: comment.user.email
              } : null
            } as Comment;
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
        } as Comment];
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
      
      // Format issue data to human readable text
      const formattedText = formatIssueToHumanReadable(issue as unknown as Issue, comments, status, subIssues);
      
      // Return the formatted text
      return {
        content: [{
          type: "text",
          text: formattedText,
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