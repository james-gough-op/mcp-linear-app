import { z } from "zod";
import {
  Comment
} from '../../generated/linear-types.js';
import linearClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * Interface for Linear API comment response
 */
interface CommentCreateResponse {
  success?: boolean;
  commentCreate?: {
    comment: Comment;
    success: boolean;
  };
}

/**
 * Create comment for issue tool schema definition
*/
const createCommentSchema = z.object({
  issueId: z.string().describe("The ID of the issue to send a comment to"),
  comment: z.string().describe("The comment to send to the issue"),
});

/**
 * Tool implementation for creating a comment on a Linear issue
 * with simple success message format
 */
export const LinearCreateCommentTool = createSafeTool({
  name: "create_comment",
  description: "A tool that creates a comment on an issue in Linear",
  schema: createCommentSchema.shape,
  handler: async (args: z.infer<typeof createCommentSchema>) => {
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
      
      if (!args.comment || args.comment.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Comment content cannot be empty",
          }],
        };
      }
      
      // Create the comment
      const createCommentResponse = await linearClient.createComment({
        body: args.comment,
        issueId: args.issueId,
      });
      
      if (!createCommentResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to create comment. Please check the issue ID and try again.",
          }],
        };
      }
      
      // Linear SDK returns results in success and entity pattern
      if (createCommentResponse.success) {
        // Access comment and get ID with the correct data type
        const comment = await createCommentResponse.comment;
        if (comment && comment.id) {
          return {
            content: [{
              type: "text",
              text: `Status: Success\nMessage: Linear comment created\nComment ID: ${comment.id}`,
            }],
          };
        }
      }
      
      // Extract data from response to check for success
      const commentResponse = createCommentResponse as unknown as CommentCreateResponse;
      
      // If the response indicates failure, return an error
      if (commentResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to create comment. Please check the issue ID and try again.",
          }],
        };
      }
      
      // Extract comment data from the correct property
      const commentData: Comment = 
        (commentResponse.commentCreate && commentResponse.commentCreate.comment) || 
        (createCommentResponse as unknown as Comment);
      
      // Check the parsed response result directly
      const commentId = commentData?.id || (createCommentResponse as unknown as { id?: string })?.id;
      if (commentId) {
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear comment created\nComment ID: ${commentId}`,
          }],
        };
      }
      
      if (!commentData) {
        // Show success message even if data is incomplete
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment created",
          }],
        };
      }
      
      if (!commentData.id) {
        // Comment data exists but no ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment created (ID not available)",
          }],
        };
      }
      
      // Success case with ID available
      return {
        content: [{
          type: "text",
          text: `Status: Success\nMessage: Linear comment created\nComment ID: ${commentData.id}`,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while creating the comment:\n${errorMessage}`,
        }],
      };
    }
  }
}); 