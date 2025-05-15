import { z } from "zod";
import enhancedClient from '../../libs/client.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';

/**
 * GraphQL mutation for creating a project
 */
const CREATE_PROJECT_MUTATION = `
  mutation CreateProject($name: String!, $description: String, $teamIds: [String!]!, $color: String, $state: ProjectStateInput) {
    projectCreate(
      input: {
        name: $name,
        description: $description,
        teamIds: $teamIds,
        color: $color,
        state: $state
      }
    ) {
      success
      project {
        id
        name
        description
        state
        color
      }
    }
  }
`;

/**
 * Type definition for the project create response
 */
interface ProjectCreateResponse {
  projectCreate: {
    success: boolean;
    project: {
      id: string;
      name: string;
      description?: string;
      state?: string;
      color?: string;
    };
  };
}

/**
 * Validate hex color code format
 */
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

/**
 * Define project states as an enum with the exact values Linear expects
 */
const ProjectState = z.enum([
  "backlog",
  "planned", 
  "started", 
  "paused", 
  "completed", 
  "canceled"
]);

/**
 * Schema for create project input parameters
 */
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").describe("The name of the project"),
  description: z.string().optional().describe("Optional project description"),
  teamIds: z.array(LinearIdSchema).min(1, "At least one team ID is required").describe("IDs of teams associated with this project"),
  color: z.string().regex(HEX_COLOR_REGEX, "Color must be a valid hex color (e.g., #FF5500)").optional().describe("Project color (hex)"),
  state: ProjectState.optional().describe("Project state: planned, started, paused, completed, or canceled")
});

/**
 * Format project data into human-readable text
 * @param project Project data to format
 * @param teamIds Array of team IDs associated with the project
 * @returns Formatted text for human readability
 */
function formatProjectToHumanReadable(project: any, teamIds: string[]): string {
  if (!project || !project.id) {
    return "Invalid or incomplete project data";
  }

  let result = "LINEAR PROJECT CREATED\n";
  result += "=======================\n\n";
  
  // Basic information
  result += `--- PROJECT DETAILS ---\n`;
  result += `ID: ${project.id}\n`;
  result += `NAME: ${safeText(project.name)}\n`;
  
  if (project.description) {
    result += `DESCRIPTION: ${safeText(project.description)}\n`;
  }
  
  if (project.color) {
    result += `COLOR: ${safeText(project.color)}\n`;
  }
  
  if (project.state) {
    result += `STATE: ${safeText(project.state)}\n`;
  }
  
  // Add team IDs
  if (teamIds && teamIds.length > 0) {
    result += `\n--- TEAM INFO ---\n`;
    teamIds.forEach((teamId: string, index: number) => {
      result += `TEAM ${index + 1} ID: ${teamId}\n`;
    });
  }
  
  result += "\nThe project has been successfully created in Linear.";
  
  return result;
}

/**
 * Create project tool implementation
 */
export const LinearCreateProjectTool = createSafeTool({
  name: "mcp_linear_create_project",
  description: "Creates a new project in Linear with team associations and other details",
  schema: createProjectSchema.shape,
  handler: async (args: z.infer<typeof createProjectSchema>) => {
    try {
      // No need to convert state to uppercase, Linear expects the same case as our enum
      const state = args.state;
      
      // Execute the GraphQL mutation
      const response = await enhancedClient.executeGraphQLMutation<ProjectCreateResponse>(
        CREATE_PROJECT_MUTATION,
        {
          name: args.name,
          description: args.description || "",
          teamIds: args.teamIds,
          color: args.color,
          state: state
        }
      );
      
      // Format and return response
      if (response.data?.projectCreate?.success) {
        const project = response.data.projectCreate.project;
        
        return {
          content: [{
            type: "text",
            text: formatProjectToHumanReadable(project, args.teamIds)
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: "Failed to create project. Please check your parameters and try again."
        }]
      };
    } catch (error) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `An error occurred while creating the project: ${errorMessage}`
        }]
      };
    }
  }
}); 