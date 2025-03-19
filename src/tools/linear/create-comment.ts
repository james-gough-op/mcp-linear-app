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
      
      // Mendapatkan ID komentar dari respons
      // Linear SDK mengembalikan hasil dalam pola success dan entity
      if (createCommentResponse.success) {
        // Mengakses komentar dan mendapatkan ID dengan tipe data yang benar
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
      const commentResponse = createCommentResponse as unknown as LinearCommentResponse;
      
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
      const commentData: CommentResponseData = commentResponse.comment || createCommentResponse as unknown as CommentResponseData;
      
      // Langsung cek hasil respons yang telah diparsing
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
        // Tampilkan pesan sukses meski data tidak lengkap
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment created",
          }],
        };
      }
      
      if (!commentData.id) {
        // Data komentar ada tapi tidak ada ID
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear comment created (ID not available)",
          }],
        };
      }
      
      // Kasus sukses dengan ID tersedia
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