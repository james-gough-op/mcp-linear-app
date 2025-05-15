import { z } from "zod";
import { Team } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";

/**
 * Format team data into human-readable text
 * @param teams Array of team data objects
 * @returns Formatted text for human readability
 */
function formatTeamsToHumanReadable(teams: Team[]): string {
  if (!teams || teams.length === 0) {
    return "No teams found in your Linear workspace.";
  }

  let result = "";
  
  teams.forEach((team, index) => {
    if (index > 0) {
      result += "\n";
    }
    result += `Team ID: ${team.id}`;
  });
  
  return result;
}

/**
 * Tool implementation for getting team IDs from Linear
 */
export const LinearGetTeamIdTool = createSafeTool({
  name: "get_team_id",
  description: "A tool that gets all teams and their IDs from Linear",
  schema: z.object({}).shape,
  handler: async () => {
    try {
      // Get teams from Linear
      const teamsResponse = await enhancedClient.teams();
      
      if (!teamsResponse || !teamsResponse.nodes) {
        return {
          content: [{
            type: "text",
            text: "Could not retrieve teams from Linear. Please check your connection or permissions.",
          }],
        };
      }
      
      // Use the team nodes directly as Team type
      const teams = teamsResponse.nodes as unknown as Team[];
      
      // Format teams to human-readable text
      const formattedText = formatTeamsToHumanReadable(teams);
      
      // Return formatted text
      return {
        content: [{
          type: "text",
          text: formattedText,
        }],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while retrieving teams:\n${errorMessage}`,
        }],
      };
    }
  }
}); 