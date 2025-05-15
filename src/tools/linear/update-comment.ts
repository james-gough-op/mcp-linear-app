import { z } from "zod";
import { Comment } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * Interface for Linear API comment response
 */
interface CommentUpdateResponse {
  success?: boolean;
  commentUpdate?: {
    comment: Comment;
    success: boolean;
  };
}

/**
 * Interface for Linear API delete response
 */
interface LinearDeleteResponse {
  success?: boolean;
  [key: string]: unknown;
}

/**
 * Update comment tool schema definition
*/
const updateCommentSchema = z.object({
  commentId: z.string().describe("The ID of the comment to update"),
  comment: z.string().describe("The new content for the comment").optional(),
  delete: z.boolean().describe("Whether to delete the comment").optional().default(false),
});

/**
 * Tool implementation for updating or deleting a comment on a Linear issue
 * with simple success message format
 */
export const LinearUpdateCommentTool = createSafeTool({
  name: "update_comment",
  description: "A tool that updates or deletes an existing comment on an issue in Linear",
  schema: updateCommentSchema.shape,
  handler: async (args: z.infer<typeof updateCommentSchema>) => {
    try {
      // Validate input
      if (!args.commentId || args.commentId.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Comment ID cannot be empty",
          }],
        };
      }
      
      // Handle delete operation if delete flag is true
      if (args.delete === true) {
        // Delete the comment
        const deleteCommentResponse = await enhancedClient.deleteComment(args.commentId);
        
        if (!deleteCommentResponse) {
          return {
            content: [{
              type: "text",
              text: "Failed to delete comment. Please check the comment ID and try again.",
            }],
          };
        }
        
        // Check if the delete operation was successful
        const deleteResponse = deleteCommentResponse as unknown as LinearDeleteResponse;
        
        if (deleteResponse.success === false) {
          return {
            content: [{
              type: "text",
              text: "Failed to delete comment. Please check the comment ID and try again.",
            }],
          };
        }
        
        // Return success message for deletion
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear comment deleted\nComment ID: ${args.commentId}`,
          }],
        };
      }
      
      // For update operations, comment content is required
      if (!args.comment || args.comment.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Comment content cannot be empty for update operations",
          }],
        };
      }
      
      // Update the comment
      const updateCommentResponse = await enhancedClient.updateComment(args.commentId, {
        body: args.comment,
      });
      
      if (!updateCommentResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to update comment. Please check the comment ID and try again.",
          }],
        };
      }
      
      // Getting comment ID from response
      // Linear SDK returns results in success and entity pattern
      if (updateCommentResponse.success) {
        // Access comment and get ID with correct data type
        const comment = await updateCommentResponse.comment;
        if (comment && comment.id) {
          return {
            content: [{
              type: "text",
              text: `Status: Success\nMessage: Linear comment updated\nComment ID: ${comment.id}`,
            }],
          };
        }
      }
      
      // Extract data from response to check for success
      const commentResponse = updateCommentResponse as unknown as CommentUpdateResponse;
      
      // If the response indicates failure, return an error
      if (commentResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to update comment. Please check the comment ID and try again.",
          }],
        };
      }
      
      // Extract comment data from the correct property
      const commentData: Comment = 
        (commentResponse.commentUpdate && commentResponse.commentUpdate.comment) || 
        (updateCommentResponse as unknown as Comment);
      
      // Check the parsed response result directly
      const commentId = commentData?.id || (updateCommentResponse as unknown as { id?: string })?.id;
      if (commentId) {
        return {
          content: [{
            type: "text",
            text: `Status: Success\nMessage: Linear comment updated\nComment ID: ${commentId}`,
          }],
        };
      }
      
      if (!commentData) {
        // Show success message even if data is incomplete
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment updated",
          }],
        };
      }
      
      if (!commentData.id) {
        // Comment data exists but no ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment updated (ID not available)",
          }],
        };
      }
      
      // Success case with ID available
      return {
        content: [{
          type: "text",
          text: `Status: Success\nMessage: Linear comment updated\nComment ID: ${commentData.id}`,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while updating or deleting the comment:\n${errorMessage}`,
        }],
      };
    }
  }
}); 