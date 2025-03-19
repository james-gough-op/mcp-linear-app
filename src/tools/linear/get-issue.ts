import { createSafeTool } from "../../libs/tool-utils.js";
import { z } from "zod";
import linearClient from '../../libs/client.js';
import { getPriorityLabel, formatDate, safeText } from '../../libs/utils.js';

/**
 * Schema definition for the get issue tool
 * Defines the required parameters to retrieve an issue
 */
const getIssueSchema = z.object({
  issueId: z.string().describe("The ID of the issue to retrieve"),
});

/**
 * Interface defining the structure of an issue comment
 * Used for type safety when processing comments
 */
interface IssueComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Interface for issue data object
 */
interface IssueData {
  id: string;
  title: string;
  description?: string;
  priority: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  dueDate?: string | Date;
  url: string;
  state?: unknown;
  assignee?: unknown;
  labels?: unknown;
}

/**
 * Interface for status object
 */
interface StatusData {
  id: string;
  name: string;
  color: string;
  type: string;
}

/**
 * Interface for sub-issue object
 */
interface SubIssueData {
  id: string;
  title: string;
  priority: number;
  status: StatusData | null;
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
  issue: IssueData, 
  comments: IssueComment[], 
  status: StatusData | null,
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
      
      // Fetch the issue using the Linear client
      const issue = await linearClient.issue(args.issueId);
      
      // Return an error message if the issue doesn't exist
      if (!issue) {
        return {
          content: [{
            type: "text",
            text: "Issue not found with that ID.",
          }],
        };
      }
      
      // Safely fetch comments with error handling
      let comments: IssueComment[] = [];
      try {
        const commentsQuery = await issue.comments();
        
        // Process and transform comments to a consistent format
        comments = commentsQuery.nodes.map((comment: unknown): IssueComment => {
          try {
            // Apply explicit type checking to ensure proper comment structure
            const typedComment = comment as {
              id: string;
              body: string;
              createdAt: string;
              updatedAt: string;
              user: { id: string; name: string; email: string } | null;
            };
            
            // Extract and format relevant comment data
            return {
              id: typedComment.id || "unknown-id",
              body: typedComment.body || "",
              createdAt: typedComment.createdAt || new Date().toISOString(),
              updatedAt: typedComment.updatedAt || new Date().toISOString(),
              user: typedComment.user ? {
                id: typedComment.user.id || "unknown-user-id",
                name: typedComment.user.name || "Unknown User",
                email: typedComment.user.email || ""
              } : null
            };
          } catch {
            // Return fallback comment on parsing error
            return {
              id: "error-parsing",
              body: "Error loading comment content",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: null
            };
          }
        });
      } catch {
        // Fail gracefully if comments can't be loaded
        comments = [{
          id: "comments-error",
          body: "Could not load comments: server error",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null
        }];
      }

      // Safely fetch issue state/status with error handling
      let status: StatusData | null = null;
      try {
        const stateData = await issue.state;
        if (stateData) {
          status = {
            id: stateData.id || "unknown-id",
            name: stateData.name || "Unknown status",
            color: stateData.color || "#cccccc",
            type: stateData.type || "unknown",
          };
        }
      } catch {
        // Fail gracefully if status can't be loaded
        status = {
          id: "status-error",
          name: "Error loading status",
          color: "#cccccc",
          type: "error",
        };
      }
      
      // Fetch sub-issues with error handling
      let subIssues: SubIssueData[] = [];
      try {
        // Get child issues using the Linear client
        const childIssuesQuery = await issue.children();
        
        if (childIssuesQuery && childIssuesQuery.nodes) {
          // Process each sub-issue
          for (const childIssue of childIssuesQuery.nodes) {
            try {
              // Get status for each sub-issue
              let subIssueStatus: StatusData | null = null;
              try {
                const childStateData = await childIssue.state;
                if (childStateData) {
                  subIssueStatus = {
                    id: childStateData.id || "unknown-id",
                    name: childStateData.name || "Unknown status",
                    color: childStateData.color || "#cccccc",
                    type: childStateData.type || "unknown",
                  };
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
      } catch {
        // Fail gracefully if sub-issues can't be loaded
        subIssues = [];
      }
      
      // Create normalized issue data object with safe defaults
      const issueData: IssueData = {
        id: issue.id || "unknown-id",
        title: issue.title || "No title",
        description: issue.description || undefined,
        priority: typeof issue.priority === 'number' ? issue.priority : 0,
        createdAt: issue.createdAt || new Date(),
        updatedAt: issue.updatedAt || new Date(),
        dueDate: issue.dueDate || undefined,
        url: issue.url || `https://linear.app/issue/${args.issueId}`,
        assignee: issue.assignee || undefined,
        labels: issue.labels || undefined
      };
      
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