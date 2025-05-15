import { z } from "zod";
import { Comment } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { formatDate, safeText } from '../../libs/utils.js';

/**
 * Schema definition for the get comment tool
 * Defines the required parameters to retrieve comments
 */
const getCommentSchema = z.object({
  issueId: z.string().describe("The ID of the issue to get comments from"),
});

/**
 * Format comments to human readable text
 * 
 * @param comments Array of comment objects
 * @returns Formatted text representation of comments
 */
function formatCommentsToHumanReadable(comments: Comment[]): string {
  if (!comments || comments.length === 0) {
    return "No comments found for this issue.";
  }

  let formattedText = `Comments (${comments.length}):\n\n`;
  
  comments.forEach((comment, index) => {
    const userName = comment.user?.name || "Unknown User";
    const formattedDate = formatDate(new Date(comment.createdAt));
    const commentBody = safeText(comment.body);
    
    formattedText += `[${index + 1}] ${userName} - ${formattedDate}\n`;
    formattedText += `ID: ${comment.id}\n`;
    formattedText += `${commentBody}\n`;
    
    if (index < comments.length - 1) {
      formattedText += "\n---\n\n";
    }
  });
  
  return formattedText;
}

/**
 * Tool implementation for retrieving comments from a Linear issue
 */
export const LinearGetCommentTool = createSafeTool({
  name: "get_comment",
  description: "A tool that gets comments from an issue in Linear",
  schema: getCommentSchema.shape,
  handler: async (args: z.infer<typeof getCommentSchema>) => {
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
      
      // Fetch the issue to verify it exists
      const issue = await enhancedClient.safeGetIssue(args.issueId);
      
      if (!issue) {
        return {
          content: [{
            type: "text",
            text: `Error: Issue with ID ${args.issueId} not found`,
          }],
        };
      }
      
      // Fetch comments for the issue
      const query = `
        query GetComments($issueId: String!) {
          issue(id: $issueId) {
            comments {
              nodes {
                id
                body
                createdAt
                updatedAt
                user {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      `;
      
      // Define the expected return type for our query
      type CommentsQueryResponse = {
        issue: {
          comments: {
            nodes: {
              id: string;
              body: string;
              createdAt: string;
              updatedAt: string;
              user?: {
                id: string;
                name: string;
                email: string;
              } | null;
            }[];
          };
        };
      };
      
      const result = await enhancedClient.safeExecuteGraphQLQuery<CommentsQueryResponse>(query, { issueId: args.issueId });
      
      if (!result.success || !result.data?.issue?.comments?.nodes) {
        return {
          content: [{
            type: "text",
            text: `Error fetching comments: ${result.error?.message || "Unknown error"}`,
          }],
        };
      }
      
      const comments = result.data.issue.comments;
      
      if (!comments || comments.nodes.length === 0) {
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: No comments found for issue ${args.issueId}`,
          }],
        };
      }
      
      // Convert GraphQL results to our Comment type
      const commentsData = comments.nodes.map((comment) => {
        return {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          user: comment.user || null
        } as unknown as Comment;
      });
      
      // Format the response
      const formattedComments = formatCommentsToHumanReadable(commentsData);
      
      // Return the formatted response
      return {
        content: [{
          type: "text",
          text: `Status: Success\nMessage: Retrieved ${commentsData.length} comments for issue ${args.issueId}\n\n${formattedComments}`,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while retrieving comments:\n${errorMessage}`,
        }],
      };
    }
  }
}); 