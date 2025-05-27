import { LinearDocument } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { formatSuccessResponse } from '../../libs/response-utils.js';
import { createSafeTool } from "../../libs/tool-utils.js";

// Create a logger specific to this component
const logger = createLogger('CreateLabel');

/**
 * Validate hex color code format
 */
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

/**
 * Create label tool schema definition
 */
const createLabelSchema = z.object({
  name: z.string().min(1, "Label name is required").describe("The name of the label"),
  color: z.string().regex(HEX_COLOR_REGEX, "Color must be a valid hex color (e.g., #FF5500)").optional().describe("The color of the label (hex)"),
  teamId: LinearIdSchema.optional().describe("Optional team ID for team-specific labels")
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedLabelInput = z.infer<typeof createLabelSchema>;

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearCreateLabelTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "create_label",
    description: "Creates a new label in Linear (team-specific or global)",
    schema: createLabelSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      try {
        // Zod validation
        const parseResult = createLabelSchema.safeParse(args);
        if (!parseResult.success) {
          const firstError = parseResult.error.errors[0];
          return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
        }
        const validatedArgs = parseResult.data;
        const color = validatedArgs.color || "#000000";
        
        logger.info('Creating new label', { 
          name: validatedArgs.name,
          color,
          teamId: validatedArgs.teamId || 'global'
        });

        // Create label input using SDK type
        const labelInput: LinearDocument.IssueLabelCreateInput = {
          name: validatedArgs.name,
          color: color,
          teamId: validatedArgs.teamId
        };

        logger.debug('Prepared label input', { input: labelInput });

        // Call Linear API to create the label
        logger.logApiRequest('POST', 'labels', labelInput);
        const createLabelResult = await enhancedClient.safeCreateIssueLabel(labelInput);

        if (!createLabelResult.success || !createLabelResult.data) {
            logger.error('Failed to create label', { 
              error: createLabelResult.error?.message 
            });
            return formatErrorResponse(createLabelResult.error);
        }
        const label = await createLabelResult.data.issueLabel;
        if (label && label.id) {
          logger.info('Label created successfully', { labelId: label.id });
          const details = `ID: ${label.id}, name: "${validatedArgs.name}", color: ${color}`;
          return formatSuccessResponse("created", "label", details);
        }
        logger.warn('Label created but ID not available');
        return formatSuccessResponse("created", "label", `name: "${validatedArgs.name}", color: ${color} (ID not available)`);
      } catch (error) {
        logger.error('Unexpected error creating label', { 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearCreateLabelTool = createLinearCreateLabelTool();