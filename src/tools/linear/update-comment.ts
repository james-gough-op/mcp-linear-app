import { createSafeTool } from "../../libs/tool-utils.js";
import { z } from "zod";
import linearClient from '../../libs/client.js';

/**
 * Interface for comment response data
 */
interface CommentResponseData {
  id?: string;
  body?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  issueId?: string;
  url?: string;
  success?: boolean;
  [key: string]: unknown;
}

/**
 * Interface for Linear API comment response
 */
interface LinearCommentResponse {
  success?: boolean;
  comment?: CommentResponseData;
  [key: string]: unknown;
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
        const deleteCommentResponse = await linearClient.deleteComment(args.commentId);
        
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
      const updateCommentResponse = await linearClient.updateComment(args.commentId, {
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
      
      // Mendapatkan ID komentar dari respons
      // Linear SDK mengembalikan hasil dalam pola success dan entity
      if (updateCommentResponse.success) {
        // Mengakses komentar dan mendapatkan ID dengan tipe data yang benar
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
      const commentResponse = updateCommentResponse as unknown as LinearCommentResponse;
      
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
      const commentData: CommentResponseData = commentResponse.comment || updateCommentResponse as unknown as CommentResponseData;
      
      // Langsung cek hasil respons yang telah diparsing
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
        // Tampilkan pesan sukses meski data tidak lengkap
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment updated",
          }],
        };
      }
      
      if (!commentData.id) {
        // Data komentar ada tapi tidak ada ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment updated (ID not available)",
          }],
        };
      }
      
      // Kasus sukses dengan ID tersedia
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