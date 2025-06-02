import { CommentPayload, LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearResult } from '../../libs/errors.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";

// Create a logger specific to this component
const logger = createLogger('CreateComment');

// Schema definition aligns with LinearDocument.CommentCreateInput structure
const createCommentSchema = z.object({
  issueId: z.string().describe("The ID of the issue to send a comment to"),
  comment: z.string().describe("The comment to send to the issue"),
});

// Type for our validated input
type ValidatedCommentInput = z.infer<typeof createCommentSchema>;

// Minimal interface for DI
interface HasSafeCreateComment {
  safeCreateComment: (input: LinearDocument.CommentCreateInput) => Promise<LinearResult<CommentPayload>>;
}

export function createLinearCreateCommentTool(enhancedClient: HasSafeCreateComment = getEnhancedClient()) {
  return createSafeTool({
    name: "create_comment",
    description: "A tool that creates a comment on an issue in Linear",
    schema: createCommentSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = createCommentSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;

      try {
        logger.info('Creating comment', { 
          issueId: validatedArgs.issueId,
          commentLength: validatedArgs.comment.length
        });

        // Map our validated input to LinearDocument.CommentCreateInput
        const commentInput: LinearDocument.CommentCreateInput = {
          body: validatedArgs.comment,
          issueId: validatedArgs.issueId,
        };

        logger.debug('Prepared comment input', { input: commentInput });
        logger.logApiRequest('POST', 'comment', { issueId: validatedArgs.issueId });
        
        const createCommentResult = await enhancedClient.safeCreateComment(commentInput);

        if (!createCommentResult.success || !createCommentResult.data) {
          logger.error('Failed to create comment', { 
            issueId: validatedArgs.issueId,
            error: createCommentResult.error?.message 
          });
          return formatErrorResponse(createCommentResult.error);
        }

        const commentData = createCommentResult.data;
        const comment = await commentData.comment;

        if (comment && comment.id) {
          logger.info('Comment created successfully', { 
            commentId: comment.id,
            issueId: validatedArgs.issueId
          });
          return formatSuccessResponse("created", "comment", `ID: ${comment.id}, on issue: ${validatedArgs.issueId}`);
        }

        logger.warn('Comment created but ID not available', { 
          issueId: validatedArgs.issueId 
        });
        return formatSuccessResponse("created", "comment", `on issue: ${validatedArgs.issueId} (ID not available)`);
      } catch (error) {
        logger.error('Unexpected error creating comment', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedCommentInput).issueId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearCreateCommentTool = createLinearCreateCommentTool();