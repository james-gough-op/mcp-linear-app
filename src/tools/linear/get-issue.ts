import { z } from "zod";
import { Comment, Issue, WorkflowState } from '../../generated/linear-types.js';
import linearClient, { enhancedClient } from '../../libs/client.js';
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
      
      // Fetch the issue using the new enhanced client
      const issue = await enhancedClient.issue(args.issueId);
      
      // Return an error message if the issue doesn't exist
      if (!issue) {
        return {
          content: [{
            type: "text",
            text: "Issue not found with that ID.",
          }],
        };
      }
      
      // For backward compatibility, we need to maintain the same behavior
      // but work with the new structure. Here we'll use the issue data from the 
      // enhanced client and get the comments using the old client for now.
      
      // Safely fetch comments with error handling
      let comments: Comment[] = [];
      try {
        // Continue using legacy client for comments for now, as it has the method pattern
        const legacyIssue = await linearClient.issue(args.issueId);
        const commentsQuery = await legacyIssue.comments();
        
        // Process and transform comments to a consistent format
        comments = await Promise.all(commentsQuery.nodes.map(async (comment) => {
          try {
            // Process user data if available
            let userData = null;
            if (comment.user) {
              const user = await comment.user;
              userData = {
                id: user.id,
                name: user.name,
                email: user.email
              };
            }
            
            return {
              id: comment.id || "unknown-id",
              body: comment.body || "",
              createdAt: comment.createdAt || new Date().toISOString(),
              updatedAt: comment.updatedAt || new Date().toISOString(),
              user: userData
            } as Comment;
          } catch {
            // Return fallback comment on parsing error
            return {
              id: "error-parsing",
              body: "Error loading comment content",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: null
            } as Comment;
          }
        }));
      } catch {
        // Fail gracefully if comments can't be loaded
        comments = [{
          id: "comments-error",
          body: "Could not load comments: server error",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null
        } as Comment];
      }

      // Get state using the legacy client for consistency
      let status: WorkflowState | null = null;
      try {
        // Continue using legacy client for state access
        const legacyIssue = await linearClient.issue(args.issueId);
        const stateData = await legacyIssue.state;
        
        if (stateData) {
          status = {
            id: stateData.id || "unknown-id",
            name: stateData.name || "Unknown status",
            color: stateData.color || "#cccccc",
            type: stateData.type || "unknown",
          } as WorkflowState;
        }
      } catch {
        status = null;
      }
      
      // Access related issues through a different path or fetch them separately
      // We might need to make a secondary query using linearClient
      const legacyIssue = await linearClient.issue(args.issueId);
      const childIssuesQuery = await legacyIssue.children();
      
      // Fetch sub-issues with error handling
      let subIssues: SubIssueData[] = [];
      if (childIssuesQuery && childIssuesQuery.nodes) {
        // Process each sub-issue
        for (const childIssue of childIssuesQuery.nodes) {
          try {
            // Get status for each sub-issue
            let subIssueStatus: WorkflowState | null = null;
            try {
              const childStateData = await childIssue.state;
              if (childStateData) {
                subIssueStatus = {
                  id: childStateData.id || "unknown-id",
                  name: childStateData.name || "Unknown status",
                  color: childStateData.color || "#cccccc",
                  type: childStateData.type || "unknown",
                } as WorkflowState;
              }
            } catch {
              subIssueStatus = null;
            }
            
            // Add sub-issue to the array
            subIssues.push({
              id: childIssue.id || "unknown-id",
              title: childIssue.title || "No title",
              priority: typeof childIssue.priority === 'number' ? childIssue.priority : 0,
              status: subIssueStatus
            });
          } catch {
            // Skip sub-issues that can't be processed
            continue;
          }
        }
      } else {
        // Fallback to using old client for sub-issues
        const legacyIssue = await linearClient.issue(args.issueId);
        const childIssuesQuery = await legacyIssue.children();
        
        if (childIssuesQuery && childIssuesQuery.nodes) {
          // Process each sub-issue
          for (const childIssue of childIssuesQuery.nodes) {
            try {
              // Get status for each sub-issue
              let subIssueStatus: WorkflowState | null = null;
              try {
                const childStateData = await childIssue.state;
                if (childStateData) {
                  subIssueStatus = {
                    id: childStateData.id || "unknown-id",
                    name: childStateData.name || "Unknown status",
                    color: childStateData.color || "#cccccc",
                    type: childStateData.type || "unknown",
                  } as WorkflowState;
                }
              } catch {
                subIssueStatus = null;
              }
              
              // Add sub-issue to the array
              subIssues.push({
                id: childIssue.id || "unknown-id",
                title: childIssue.title || "No title",
                priority: typeof childIssue.priority === 'number' ? childIssue.priority : 0,
                status: subIssueStatus
              });
            } catch {
              // Skip sub-issues that can't be processed
              continue;
            }
          }
        }
      }
      
      // Use the issue directly as an Issue type
      const issueData = issue as unknown as Issue;
      
      // Format issue data to human readable text
      const formattedText = formatIssueToHumanReadable(issueData, comments, status, subIssues);
      
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