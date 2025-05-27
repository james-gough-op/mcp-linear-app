import { Comment as LinearComment, Issue as LinearIssue, User as LinearUser, WorkflowState } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from "../../libs/utils.js";

// Create a logger specific to this component
const logger = createLogger('GetIssue');

/**
 * Schema for retrieving an issue 
 */
const getIssueSchema = z.object({
  issueId: z.string().describe("The ID of the issue to retrieve"),
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedIssueInput = z.infer<typeof getIssueSchema>;

/**
 * Interface for formatted sub-issue data
 * We maintain this custom interface as it's specific to our tool's output format
 */
interface FormattedSubIssue {
  id: string;
  title: string;
  priority: number;
  statusName: string;
  statusColor: string;
}

/**
 * Interface for formatted comment data
 * We maintain this custom interface as it's specific to our tool's output format
 */
interface FormattedComment {
  id: string;
  body: string;
  createdAt: string; 
  updatedAt: string;
  userName: string;
}

/**
 * Tool implementation for retrieving detailed issue information
 */
export function createLinearGetIssueTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "get_issue",
    description: "A tool that gets an issue from Linear, including sub-issues and comments count.",
    schema: getIssueSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = getIssueSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;

      try {
        logger.info('Getting issue details', { issueId: validatedArgs.issueId });

        // Fetch the issue data
        logger.logApiRequest('GET', `issue/${validatedArgs.issueId}`, {});
        const issueResult = await enhancedClient.safeGetIssue(validatedArgs.issueId);

        if (!issueResult.success || !issueResult.data) {
          logger.error('Issue not found', { 
            issueId: validatedArgs.issueId, 
            error: issueResult.error?.message 
          });
          return formatErrorResponse(issueResult.error);
        }

        const issue = issueResult.data as LinearIssue;
        logger.info('Issue found', { 
          issueId: issue.id, 
          title: issue.title 
        });

        // Fetch and format comments
        let formattedComments: FormattedComment[] = [];
        try {
          logger.debug('Fetching comments for issue', { issueId: validatedArgs.issueId });
          logger.logApiRequest('GET', `issue/${validatedArgs.issueId}/comments`, {});
          
          const commentsConnection = await issue.comments();
          if (commentsConnection?.nodes) {
            logger.debug('Comments fetched successfully', { 
              count: commentsConnection.nodes.length 
            });
            
            formattedComments = await Promise.all(commentsConnection.nodes.map(async (comment: LinearComment) => {
              const user = await comment.user as LinearUser | null;
              return {
                id: comment.id || "unknown-comment-id",
                body: comment.body || "",
                createdAt: comment.createdAt?.toISOString() || new Date(0).toISOString(),
                updatedAt: comment.updatedAt?.toISOString() || new Date(0).toISOString(),
                userName: user?.name || "Unknown User",
              };
            }));
          }
        } catch (error) {
          logger.error('Failed to fetch comments', { 
            issueId: validatedArgs.issueId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // We continue execution even if comments fetch fails
        }

        // Extract state information
        logger.debug('Fetching state information');
        const state = await issue.state as WorkflowState | null;
        const statusName = state?.name || "Unknown status";
        const statusColor = state?.color || "#cccccc";

        // Extract and format sub-issues
        logger.debug('Fetching sub-issues');
        let formattedSubIssues: FormattedSubIssue[] = [];
        try {
          const childrenConnection = await issue.children();
          if (childrenConnection?.nodes) {
            logger.debug('Sub-issues fetched successfully', { 
              count: childrenConnection.nodes.length 
            });
            
            formattedSubIssues = await Promise.all(childrenConnection.nodes.map(async (childIssue: LinearIssue) => {
              const childState = await childIssue.state as WorkflowState | null;
              return {
                id: childIssue.id || "unknown-subissue-id",
                title: childIssue.title || "No title",
                priority: typeof childIssue.priority === 'number' ? childIssue.priority : 0,
                statusName: childState?.name || "Unknown status",
                statusColor: childState?.color || "#cccccc",
              };
            }));
          }
        } catch (error) {
          logger.error('Failed to fetch sub-issues', { 
            issueId: validatedArgs.issueId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // We continue execution even if sub-issues fetch fails
        }

        // Format the output
        logger.debug('Formatting response');
        let outputText = `Success: Issue Details\n`;
        outputText += `ID: ${safeText(issue.id)}\n`;
        outputText += `Title: ${safeText(issue.title)}\n`;
        outputText += `Description: ${safeText(issue.description || 'No description')}\n`;
        outputText += `Status: ${safeText(statusName)} (Color: ${statusColor})\n`;
        outputText += `Priority: ${issue.priority === 0 ? 'No Priority' : issue.priority || 'N/A'}\n`;
        outputText += `Created At: ${issue.createdAt?.toISOString() || 'N/A'}\n`;
        outputText += `Updated At: ${issue.updatedAt?.toISOString() || 'N/A'}\n`;

        // Add assignee information if available
        try {
          const assignee = await issue.assignee as LinearUser | null;
          if (assignee) {
            outputText += `Assignee: ${safeText(assignee.name)} (ID: ${assignee.id})\n`;
          }
        } catch (error) {
          logger.warn('Failed to fetch assignee', { issueId: validatedArgs.issueId });
        }

        // Add project information if available
        try {
          const project = await issue.project;
          if (project) {
            outputText += `Project: ${safeText(project.name)} (ID: ${project.id})\n`;
          }
        } catch (error) {
          logger.warn('Failed to fetch project', { issueId: validatedArgs.issueId });
        }

        // Format sub-issues section
        outputText += `\n--- Sub-issues (${formattedSubIssues.length}) ---\n`;
        if (formattedSubIssues.length > 0) {
          formattedSubIssues.forEach(sub => {
            outputText += `- ID: ${safeText(sub.id)}, Title: ${safeText(sub.title)}, Status: ${safeText(sub.statusName)}\n`;
          });
        } else {
          outputText += "No sub-issues.\n";
        }

        // Format comments section
        outputText += `\n--- Comments (${formattedComments.length}) ---\n`;
        if (formattedComments.length > 0) {
          formattedComments.forEach(comment => {
            outputText += `- ID: ${safeText(comment.id)}, User: ${safeText(comment.userName)}, Created: ${comment.createdAt}\n   Body: ${safeText(comment.body.substring(0, 100))}${comment.body.length > 100 ? '...' : ''}\n`;
          });
        } else {
          outputText += "No comments or failed to load comments.\n";
        }

        logger.info('Successfully formatted issue response', { 
          issueId: issue.id,
          commentsCount: formattedComments.length,
          subIssuesCount: formattedSubIssues.length
        });

        return {
          content: [{
            type: "text",
            text: outputText,
          }],
          isError: false
        };
      } catch (error) {
        logger.error('Unexpected error retrieving issue data', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          issueId: (args as ValidatedIssueInput).issueId
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearGetIssueTool = createLinearGetIssueTool();