import { Team as LinearTeam } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from "../../libs/utils.js";

// Create a logger specific to this component
const logger = createLogger('GetTeamId');

/**
 * Format team data into human-readable text.
 * @param teams Array of team data objects, explicitly typed as LinearTeam[]
 * @returns Formatted text for human readability, or an informational message if no teams found.
 */
function formatTeamsToHumanReadable(teams: LinearTeam[]): string {
  if (!teams || teams.length === 0) {
    return "No teams found in your Linear workspace.";
  }

  return teams.map(team => {
    let teamInfo = `Team ID: ${safeText(team.id)}`;
    if (team.name) {
      teamInfo += `, Name: ${safeText(team.name)}`;
    }
    return teamInfo;
  }).join("\n");
}

/**
 * Factory to create the tool with a provided client (for DI/testing)
 */
export function createLinearGetTeamIdTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "get_team_id",
    description: "A tool that gets all teams and their IDs (and names) from Linear",
    schema: z.object({}).shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = z.object({}).safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }

      try {
        logger.info('Fetching teams');
        
        // Fetch teams using the enhanced client
        logger.logApiRequest('GET', 'teams', {});
        const teamsResult = await enhancedClient.safeTeams();

        if (!teamsResult.success || !teamsResult.data?.nodes) {
          logger.error('Failed to retrieve teams', { 
            error: teamsResult.error?.message 
          });
          return formatErrorResponse(teamsResult.error);
        }

        // Process the teams data
        const teams = teamsResult.data.nodes as LinearTeam[];
        logger.info('Teams retrieved successfully', { count: teams.length });
        
        logger.debug('Formatting team data for display');
        const formattedText = formatTeamsToHumanReadable(teams);

        // Return formatted response
        if (teams.length === 0) {
          logger.info('No teams found in workspace');
          return {
            content: [{type: "text", text: `Success: ${formattedText}`}],
            isError: false
          };
        }

        return {
          content: [{
            type: "text",
            text: `Success: Team IDs retrieved.\n\n${formattedText}`,
          }],
          isError: false
        };
      } catch (error) {
        logger.error('Unexpected error retrieving teams', { 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearGetTeamIdTool = createLinearGetTeamIdTool();