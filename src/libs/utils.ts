/**
 * Helper function to safely convert priority number to descriptive label
 * Handles invalid priority values gracefully
 * 
 * @param priority Priority number (0-4)
 * @returns Descriptive label for the priority
 */
export function getPriorityLabel(priority: number | null | undefined): string {
  if (priority === null || priority === undefined) {
    return "No priority";
  }
  
  switch (priority) {
    case 0:
      return "No priority";
    case 1:
      return "Urgent";
    case 2:
      return "High";
    case 3:
      return "Medium";
    case 4:
      return "Low";
    default:
      return `Unknown (${priority})`;
  }
}

/**
 * Safely formats a date value to a human-readable string
 * Handles various date formats and potential null/undefined values
 * 
 * @param dateValue Date value to format (string, Date, or undefined)
 * @returns Formatted date string
 */
export function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "None";
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date format";
    }
    
    return date.toLocaleDateString('en-US', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "Date format error";
  }
}

/**
 * Safely gets text content, handling null/undefined values
 * 
 * @param text Text to process
 * @param defaultText Default text if input is empty
 * @returns Processed text string
 */
export function safeText(text: string | null | undefined, defaultText: string = "None"): string {
  if (text === null || text === undefined || text.trim() === "") {
    return defaultText;
  }
  return text;
}

/**
 * Cache for storing state IDs by team to reduce API calls
 * Structure: { teamId: { stateName: stateId } }
 */
const stateIdCache: Record<string, Record<string, string>> = {};

/**
 * Get state ID from Linear API based on state name and team ID
 * Uses caching to reduce API calls
 * 
 * @param stateName The name of the state (triage, backlog, todo, in_progress, done, canceled)
 * @param teamId The ID of the team
 * @returns Promise with the state ID or undefined if not found
 */
export async function getStateId(stateName: string, teamId: string): Promise<string | undefined> {
  // Check if we have a cached state ID for this team
  if (stateIdCache[teamId] && stateIdCache[teamId][stateName]) {
    return stateIdCache[teamId][stateName];
  }
  
  try {
    // Import enhancedClient for GraphQL implementation
    const { enhancedClient } = await import('./client.js');
    const team = await enhancedClient.team(teamId);
    
    if (!team) {
      console.error(`Team with ID ${teamId} not found`);
      return undefined;
    }
    
    const states = team.states?.nodes || [];
    if (!states || states.length === 0) {
      console.error(`No workflow states found for team ${teamId}`);
      return undefined;
    }
    
    // Initialize cache for this team if it doesn't exist
    if (!stateIdCache[teamId]) {
      stateIdCache[teamId] = {};
    }
    
    // Find the state by name and populate the cache while we're at it
    let targetStateId: string | undefined;
    for (const state of states) {
      const normalizedName = state.name.toLowerCase().replace(/\s+/g, '_');
      stateIdCache[teamId][normalizedName] = state.id;
      
      // Also handle our standard state naming (triage, backlog, etc.)
      if (normalizedName === stateName || 
          state.name.toLowerCase() === stateName.replace(/_/g, ' ')) {
        targetStateId = state.id;
      }
    }
    
    return targetStateId;
  } catch (error) {
    console.error(`Error fetching state ID for ${stateName} in team ${teamId}:`, error);
    return undefined;
  }
}

/**
 * Map common state names to standard Linear workflow state names
 * This helps standardize user input to match Linear's expected values
 * 
 * @param stateName The state name to normalize
 * @returns Normalized state name
 */
export function normalizeStateName(stateName: string): string {
  const mapping: Record<string, string> = {
    'triage': 'triage',
    'backlog': 'backlog',
    'todo': 'todo',
    'to_do': 'todo',
    'in_progress': 'in_progress',
    'in-progress': 'in_progress',
    'inprogress': 'in_progress',
    'done': 'done',
    'completed': 'done',
    'canceled': 'canceled',
    'cancelled': 'canceled'
  };
  
  const normalized = stateName.toLowerCase().replace(/\s+/g, '_');
  return mapping[normalized] || normalized;
} 