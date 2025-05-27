import { Comment as LinearComment, User as LinearUser } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { formatDate, safeText } from '../../libs/utils.js';

// Create a logger specific to this component
const logger = createLogger('GetComment');

/**
 * Schema definition for the get comment tool
 */
const getCommentSchema = z.object({
  issueId: z.string().describe("The ID of the issue to get comments from"),
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedCommentInput = z.infer<typeof getCommentSchema>;

/**
 * Interface for formatted comment data
 * This is a custom type for our tool's specific output format
 */
interface FormattedComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  } | null;
}

/**
 * Format comments to human readable text
 *
 * @param comments Array of formatted comment objects
 * @returns Formatted text representation of comments
 */
function formatCommentsToHumanReadable(comments: FormattedComment[]): string {
  if (!comments || comments.length === 0) {
    return "No comments found for this issue.";
  }

  let formattedText = `Comments (${comments.length}):\n\n`;
  
  comments.forEach((comment, index) => {
    const userName = comment.user?.name || "Unknown User";
    const formattedDate = comment.createdAt ? formatDate(new Date(comment.createdAt)) : "Date not available";
    const commentBody = safeText(comment.body || "Empty comment body");
    
    formattedText += `[${index + 1}] ${userName} - ${formattedDate}\n`;
    formattedText += `ID: ${comment.id || "ID not available"}\n`;
    formattedText += `${commentBody}\n`;
    
    if (index < comments.length - 1) {
      formattedText += "\n---\n\n";
    }
  });
  
  return formattedText;
}

// Factory to create the tool with a provided client (for DI/testing)
interface HasSafeGetIssue {
  safeGetIssue: (id: string) => Promise<any>;
}
export function createLinearGetCommentTool(enhancedClient: HasSafeGetIssue = getEnhancedClient()) {
  return createSafeTool({
    name: "get_comment",
    description: "A tool that gets comments from an issue in Linear",
    schema: getCommentSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = getCommentSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      try {
        logger.info('Getting comments for issue', { issueId: validatedArgs.issueId });

        // Fetch the issue to verify it exists
        logger.debug('Verifying issue exists');
        logger.logApiRequest('GET', `issue/${validatedArgs.issueId}`, {});
        const issueResult = await enhancedClient.safeGetIssue(validatedArgs.issueId);

        if (!issueResult.success || !issueResult.data) {
          logger.error('Issue not found', { 
            issueId: validatedArgs.issueId, 
            error: issueResult.error?.message 
          });
          return formatErrorResponse(issueResult.error);
        }
        
        // Fetch comments for the issue using the enhanced client
        logger.debug('Fetching comments');
        logger.logApiRequest('GET', `issue/${validatedArgs.issueId}/comments`, {});
        const issue = issueResult.data;
        let commentNodes: LinearComment[] = [];
        if (issue && typeof issue.comments === 'function') {
          const commentsConnection = await issue.comments();
          if (commentsConnection && Array.isArray(commentsConnection.nodes)) {
            commentNodes = commentsConnection.nodes;
          }
        }
        logger.info('Retrieved comments', { count: commentNodes.length });

        if (commentNodes.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Success: No comments found for issue ${validatedArgs.issueId}`
            }],
            isError: false
          };
        }
        
        // Convert SDK comment objects to our formatted structure
        logger.debug('Formatting comments');
        const formattedComments: FormattedComment[] = await Promise.all(
          commentNodes.map(async (comment: LinearComment) => {
            try {
              const user = await comment.user as LinearUser | null;
              return {
                id: comment.id,
                body: comment.body || "",
                createdAt: comment.createdAt?.toISOString() || "",
                updatedAt: comment.updatedAt?.toISOString() || "",
                user: user ? {
                  id: user.id,
                  name: user.name
                } : null
              };
            } catch (error) {
              logger.warn('Failed to fetch user for comment', { 
                commentId: comment.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              return {
                id: comment.id,
                body: comment.body || "",
                createdAt: comment.createdAt?.toISOString() || "",
                updatedAt: comment.updatedAt?.toISOString() || "",
                user: null
              };
            }
          })
        );
        
        // Format the response
        const formattedOutput = formatCommentsToHumanReadable(formattedComments);
        
        // Return the formatted response
        logger.info('Successfully formatted comments response', { 
          issueId: validatedArgs.issueId,
          commentsCount: formattedComments.length
        });
        return {
          content: [{
            type: "text",
            text: `Success: Retrieved ${formattedComments.length} comments for issue ${validatedArgs.issueId}\n\n${formattedOutput}`,
          }],
          isError: false
        };
      } catch (error) {
        logger.error('Unexpected error retrieving comments', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedCommentInput).issueId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearGetCommentTool = createLinearGetCommentTool();