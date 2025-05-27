import { LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from "../../libs/client.js";
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { formatDeleteSuccessResponse, formatUpdateSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";

// Create a logger specific to this component
const logger = createLogger('UpdateComment');

const baseCommentSchema = z.object({
    commentId: z.string().min(1, "Comment ID cannot be empty").describe("The ID of the comment to update or delete"),
    comment: z.string().optional().describe("The new content for the comment. Required if not deleting."),
    delete: z.boolean().optional().default(false).describe("Set to true to delete the comment."),
});

const updateCommentSchema = baseCommentSchema.refine(data => data.delete || (typeof data.comment === 'string' && data.comment.trim() !== ''), {
    message: "Comment content cannot be empty if not deleting the comment.",
    path: ["comment"],
});

type ValidatedCommentInput = z.infer<typeof updateCommentSchema>;

export function createLinearUpdateCommentTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "update_comment",
    description: "Updates or deletes an existing comment on a Linear issue.",
    schema: baseCommentSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = updateCommentSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      
      try {
        if (validatedArgs.delete) {
          logger.info('Deleting comment', { commentId: validatedArgs.commentId });
          
          logger.logApiRequest('DELETE', `comment/${validatedArgs.commentId}`, {});
          const deleteResult = await enhancedClient.safeDeleteComment(validatedArgs.commentId);

          if (!deleteResult.success) {
            logger.error('Failed to delete comment', { 
              commentId: validatedArgs.commentId,
              error: deleteResult.error?.message 
            });
            return formatErrorResponse(deleteResult.error);
          }
          
          logger.info('Comment deleted successfully', { commentId: validatedArgs.commentId });
          return formatDeleteSuccessResponse('comment', validatedArgs.commentId);
        }

        if (!validatedArgs.comment || validatedArgs.comment.trim() === '') {
          logger.warn('Validation error: empty comment content', { commentId: validatedArgs.commentId });
          return formatValidationError('comment', 'Comment content cannot be empty');
        }

        logger.info('Updating comment', { 
          commentId: validatedArgs.commentId,
          commentLength: validatedArgs.comment.length 
        });

        const commentUpdateInput: LinearDocument.CommentUpdateInput = {
          body: validatedArgs.comment,
        };

        logger.debug('Prepared comment update input', { input: commentUpdateInput });
        logger.logApiRequest('PUT', `comment/${validatedArgs.commentId}`, {});
        const updateResult = await enhancedClient.safeUpdateComment(validatedArgs.commentId, commentUpdateInput);

        if (!updateResult.success || !updateResult.data || !updateResult.data.comment) {
          logger.error('Failed to update comment', { 
            commentId: validatedArgs.commentId,
            error: updateResult.error?.message 
          });
          return formatErrorResponse(updateResult.error);
        }

        const updatedComment = await updateResult.data.comment;
        logger.info('Comment updated successfully', { commentId: updatedComment.id });
        return formatUpdateSuccessResponse('comment', updatedComment.id);

      } catch (error) {
        logger.error('Unexpected error updating/deleting comment', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          commentId: validatedArgs.commentId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearUpdateCommentTool = createLinearUpdateCommentTool();