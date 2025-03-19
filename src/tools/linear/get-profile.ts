import { createSafeTool } from "../../libs/tool-utils.js";
import { z } from "zod";
import linearClient from '../../libs/client.js';
import { formatDate, safeText } from '../../libs/utils.js';

/**
 * Interface for user profile data
 */
interface UserProfile {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  active?: boolean;
  admin?: boolean;
  guest?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastSeen?: string | Date;
  timezone?: string;
  createdIssueCount?: number;
  avatarBackgroundColor?: string;
  url?: string;
  isMe?: boolean;
}

/**
 * Format user profile data into human-readable text with simplified format
 * @param profile User profile data
 * @returns Formatted text for human readability
 */
function formatProfileToHumanReadable(profile: UserProfile): string {
  if (!profile || !profile.id) {
    return "Invalid or incomplete profile data";
  }

  let result = `User ID: ${profile.id}\n`;
  result += `Name: ${safeText(profile.name)}\n`;
  
  if (profile.displayName) {
    result += `Display name: ${safeText(profile.displayName)}\n`;
  }
  
  if (profile.email) {
    result += `Email: ${safeText(profile.email)}\n`;
  }
  
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
  
  if (profile.createdIssueCount !== undefined) {
    result += `Issues created: ${profile.createdIssueCount}\n`;
  }
  
  if (profile.url) {
    result += `URL: ${safeText(profile.url)}\n`;
  }
  
  return result;
}

/**
 * Tool implementation to get the current user's profile
 * formatted as human-readable text with simplified format
 */
export const LinearGetProfileTool = createSafeTool({
  name: "get_profile",
  description: "A tool that gets the current user's profile from Linear",
  schema: z.object({}).shape,
  handler: async () => {
    try {
      // Get user profile data
      const profile = await linearClient.viewer;
      
      if (!profile) {
        return {
          content: [{
            type: "text",
            text: "Unable to retrieve user profile. Please check your connection to Linear.",
          }],
        };
      }
      
      // Convert to UserProfile format for safe processing
      const userProfile: UserProfile = {
        id: profile.id || "unknown-id",
        name: profile.name || "No Name",
        displayName: profile.displayName,
        email: profile.email,
        active: profile.active,
        admin: profile.admin,
        guest: profile.guest,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        lastSeen: profile.lastSeen,
        timezone: profile.timezone,
        createdIssueCount: profile.createdIssueCount,
        avatarBackgroundColor: profile.avatarBackgroundColor,
        url: profile.url,
        isMe: profile.isMe
      };
      
      // Format profile to human-readable text
      const formattedText = formatProfileToHumanReadable(userProfile);
      
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
          text: `An error occurred while retrieving profile data:\n${errorMessage}`,
        }],
      };
    }
  }
}); 