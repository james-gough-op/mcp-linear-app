import { User as LinearUser } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatGenericErrorResponse } from '../../libs/error-utils.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { formatDate, safeText } from '../../libs/utils.js';

// Create a logger specific to this component
const logger = createLogger('GetProfile');

/**
 * Format user profile data into human-readable text with simplified format
 * @param profile User profile data, explicitly typed as LinearUser
 * @returns Formatted text for human readability, or an error message if profile is invalid
 */
function formatProfileToHumanReadable(profile: LinearUser): string {
  // Ensure profile and profile.id are valid, which should be guaranteed by safeGetViewer if successful
  if (!profile || !profile.id) {
    return "Error: Invalid or incomplete profile data received for formatting.";
  }

  let result = `User ID: ${profile.id}\n`;
  result += `Name: ${safeText(profile.name)}\n`; // Name should always exist for a valid User
  
  if (profile.displayName) {
    result += `Display name: ${safeText(profile.displayName)}\n`;
  }
  
  if (profile.email) {
    result += `Email: ${safeText(profile.email)}\n`;
  }

  // active, admin, guest are non-optional booleans in SDK type, so direct access is fine.
  result += `Status: ${profile.active ? "Active" : "Inactive"}\n`;
  result += `Admin: ${profile.admin ? "Yes" : "No"}\n`;
  result += `Guest: ${profile.guest ? "Yes" : "No"}\n`;
  
  if (profile.createdAt) {
    result += `Created at: ${formatDate(profile.createdAt)}\n`;
  }
  
  if (profile.lastSeen) {
    result += `Last seen: ${formatDate(profile.lastSeen)}\n`;
  }
  
  if (profile.timezone) {
    result += `Timezone: ${safeText(profile.timezone)}\n`;
  }

  // Check if createdIssueCount is defined and a number before using it
  if (typeof profile.createdIssueCount === 'number') {
    result += `Issues created: ${profile.createdIssueCount}\n`;
  }
  
  if (profile.url) {
    result += `URL: ${safeText(profile.url)}\n`;
  }
  
  return result;
}

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearGetProfileTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "get_profile",
    description: "A tool that gets the current user's profile from Linear",
    schema: z.object({}).shape,
    handler: async (): Promise<McpResponse> => {
      try {
        logger.info('Fetching user profile');
        
        // Fetch user profile using the enhanced client
        logger.logApiRequest('GET', 'viewer', {});
        const profileResult = await enhancedClient.safeGetViewer();

        if (!profileResult.success || !profileResult.data) {
          logger.error('Failed to retrieve user profile', { 
            error: profileResult.error?.message 
          });
          return formatErrorResponse(profileResult.error);
        }

        // Process the user profile data
        const userProfile = profileResult.data as LinearUser;
        logger.debug('Profile retrieved successfully', { 
          userId: userProfile.id,
          name: userProfile.name 
        });
        
        logger.debug('Formatting profile data');
        const formattedText = formatProfileToHumanReadable(userProfile);

        // Check if there was an error in formatting
        if (formattedText.startsWith("Error:")) {
          logger.warn('Error formatting profile data', { 
            userId: userProfile.id 
          });
          return formatGenericErrorResponse(formattedText.substring(7)); // Remove "Error: " prefix
        }

        logger.info('Profile data retrieved and formatted successfully', { 
          userId: userProfile.id 
        });
        return {
          content: [{
            type: "text",
            text: `Success: Profile data retrieved.\n\n${formattedText}`,
          }],
        };
      } catch (error) {
        logger.error('Unexpected error retrieving profile data', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearGetProfileTool = createLinearGetProfileTool();