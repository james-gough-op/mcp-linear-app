import { IssueLabel, LinearFetch } from "@linear/sdk";
import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';


/**
 * Format label data into human-readable text
 * @param label Label data to format
 * @returns Formatted text for human readability
 */
async function formatLabelToHumanReadable(label: IssueLabel): Promise<string> {
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
  if (label.team) {
    // Await the team promise to get the actual Team object
    const team = await label.team;
    if (team && team.id) {
      result += `--- TEAM INFO ---\n`;
      result += `TEAM ID: ${team.id}\n`;
      if (team.name) {
        result += `TEAM NAME: ${safeText(team.name)}\n`;
      }
      result += `\n`;
    }
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
      const createLabelResponse = await enhancedClient.safeCreateIssueLabel({
        name: args.name,
        color: color,
        teamId: args.teamId
      });
      
      // Check if the result was successful
      if (!createLabelResponse.success || !createLabelResponse.data) {
        // Handle error case
        const errorMessage = createLabelResponse.error 
          ? createLabelResponse.error.message 
          : "Failed to create label. Please check your parameters and try again.";
        
        return {
          content: [{
            type: "text",
            text: `An error occurred while creating the label: ${errorMessage}`
          }],
        };
      }
      
      // Extract the label payload from the result
      const labelResponse = createLabelResponse.data;
      
      // Getting label data from response
      if (labelResponse.issueLabel) {
        // Await the issueLabel promise to get the actual IssueLabel object
        const labelFetch = labelResponse.issueLabel as LinearFetch<IssueLabel>;
        const label = await labelFetch;
        
        if (label && label.id) {
          // Now we have the actual IssueLabel object
          return {
            content: [{
              type: "text",
              text: await formatLabelToHumanReadable(label),
            }],
          };
        }
      }
      
      // For cases where the response doesn't follow expected structure
      if (labelResponse.success === false) {
        return {
          content: [{
            type: "text",
            text: "Failed to create label. Please check your parameters and try again.",
          }],
        };
      }
      
      // Fallback for success case with minimal information
      return {
        content: [{
          type: "text",
          text: "Status: Success\nMessage: Linear label created (details not available)",
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