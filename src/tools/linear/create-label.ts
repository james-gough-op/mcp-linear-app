import { z } from "zod";
import { IssueLabel } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';

/**
 * Interface for the label create response
 */
interface IssueLabelResponse {
  success?: boolean;
  issueLabel?: IssueLabel;
}

/**
 * Format label data into human-readable text
 * @param label Label data to format
 * @returns Formatted text for human readability
 */
function formatLabelToHumanReadable(label: IssueLabel): string {
  if (!label || !label.id) {
    return "Invalid or incomplete label data";
  }

  let result = "LINEAR LABEL CREATED\n";
  result += "==================\n\n";
  
  // Basic information
  result += `--- LABEL DETAILS ---\n`;
  result += `ID: ${label.id}\n`;
  result += `NAME: ${safeText(label.name)}\n`;
  result += `COLOR: ${safeText(label.color)}\n\n`;
  
  // Team information if available
  if (label.team && label.team.id) {
    result += `--- TEAM INFO ---\n`;
    result += `TEAM ID: ${label.team.id}\n`;
    if (label.team.name) {
      result += `TEAM NAME: ${safeText(label.team.name)}\n`;
    }
    result += `\n`;
  } else {
    result += `This is a global workspace label.\n\n`;
  }
  
  result += "The label has been successfully created in Linear.";
  
  return result;
}

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
 * Tool implementation for creating a label in Linear
 * with human-readable output formatting
 */
export const LinearCreateLabelTool = createSafeTool({
  name: "create_label",
  description: "Creates a new label in Linear (team-specific or global)",
  schema: createLabelSchema.shape,
  handler: async (args: z.infer<typeof createLabelSchema>) => {
    try {
      // Validate input
      if (!args.name || args.name.trim() === "") {
        return {
          content: [{
            type: "text",
            text: "Error: Label name cannot be empty",
          }],
        };
      }
      
      // Set default color if not provided
      const color = args.color || "#000000"; // Default to black
      
      // Create the label using Linear SDK
      const createLabelResponse = await enhancedClient.createIssueLabel({
        name: args.name,
        color: color,
        teamId: args.teamId
      });
      
      if (!createLabelResponse) {
        return {
          content: [{
            type: "text",
            text: "Failed to create label. Please check your parameters and try again.",
          }],
        };
      }
      
      // Extract label data from response
      if (createLabelResponse.success) {
        // Access label and get data with correct type
        const label = await createLabelResponse.issueLabel;
        
        if (label && label.id) {
          // Use type assertion to handle type incompatibility
          return {
            content: [{
              type: "text",
              text: formatLabelToHumanReadable(label as unknown as IssueLabel),
            }],
          };
        }
      }
      
      // Alternative way to extract data for compatibility with different SDK versions
      const labelResponse = createLabelResponse as unknown as IssueLabelResponse;
      
      // Extract label data from the response
      const labelData = labelResponse.issueLabel;
      
      if (!labelData || !labelData.id) {
        return {
          content: [{
            type: "text",
            text: "Status: Success\nMessage: Linear label created (details not available)",
          }],
        };
      }
      
      // Format label data to human-readable text
      return {
        content: [{
          type: "text",
          text: formatLabelToHumanReadable(labelData),
        }],
      };
    } catch (error) {
      // Error handling - show user-friendly message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while creating the label: ${errorMessage}`
        }]
      };
    }
  }
}); 