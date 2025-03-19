import { createSafeTool } from "../../libs/tool-utils.js";
import { z } from "zod";
import linearClient from '../../libs/client.js';

/**
 * Interface for team data
 */
interface TeamData {
  id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  issueCount?: number;
  private?: boolean;
  url?: string;
}

/**
 * Format team data into human-readable text
 * @param teams Array of team data objects
 * @returns Formatted text for human readability
 */
function formatTeamsToHumanReadable(teams: TeamData[]): string {
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
      const teamsResponse = await linearClient.teams();
      
      if (!teamsResponse || !teamsResponse.nodes) {
        return {
          content: [{
            type: "text",
            text: "Could not retrieve teams from Linear. Please check your connection or permissions.",
          }],
        };
      }
      
      // Convert to TeamData format for safe processing
      const teams: TeamData[] = teamsResponse.nodes.map(team => ({
        id: team.id || "unknown-id",
        name: team.name || "Unnamed Team",
        key: team.key || "unknown-key",
        description: team.description,
        color: team.color,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        issueCount: team.issueCount,
        private: team.private,
        // Generate a URL if not available directly from the API
        url: `https://linear.app/team/${team.key}`
      }));
      
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