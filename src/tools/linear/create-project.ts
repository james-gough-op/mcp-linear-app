import { LinearDocument, Project } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearIdSchema } from '../../libs/id-management.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from '../../libs/utils.js';

// Create a logger specific to this component
const logger = createLogger('CreateProject');

/**
 * Validate hex color code format
 */
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

/**
 * Define project states as an enum with the exact values Linear expects
 */
const ProjectStateValues = z.enum([
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
  state: ProjectStateValues.optional().describe("Project state: planned, started, paused, completed, or canceled")
});

/**
 * Type for validated input from Zod schema
 */
type ValidatedProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Format project data into human-readable text
 * @param project Project data to format
 * @param teamIds Array of team IDs associated with the project
 * @returns Formatted text for human readability
 */
function formatProjectToHumanReadable(project: Project, teamIds: string[]): string {
  if (!project || !project.id) {
    return "Error: Invalid or incomplete project data provided for formatting.";
  }

  let result = "LINEAR PROJECT DETAILS\n";
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

  return result;
}

// Factory to create the tool with a provided client (for DI/testing)
export function createLinearCreateProjectTool(enhancedClient = getEnhancedClient()) {
  return createSafeTool({
    name: "mcp_linear_create_project",
    description: "Creates a new project in Linear with team associations and other details",
    schema: createProjectSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = createProjectSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      
      try {
        logger.info('Creating new project', { 
          name: validatedArgs.name,
          teamCount: validatedArgs.teamIds.length,
          state: validatedArgs.state || 'not specified'
        });
        
        // Create project input using SDK type
        const projectInput: LinearDocument.ProjectCreateInput = {
          name: validatedArgs.name,
          description: validatedArgs.description || "",
          teamIds: validatedArgs.teamIds,
          color: validatedArgs.color,
          state: validatedArgs.state
        };
        
        logger.debug('Prepared project input', { 
          input: {
            ...projectInput,
            teamIds: projectInput.teamIds?.length
          } 
        });
        
        // Use the enhanced client with the SDK type
        logger.logApiRequest('POST', 'projects', projectInput);
        const createProjectResult = await enhancedClient.safeCreateProject(projectInput);
        
        if (!createProjectResult.success || !createProjectResult.data) {
          logger.error('Failed to create project', { 
            error: createProjectResult.error?.message 
          });
          return formatErrorResponse(createProjectResult.error);
        }
        
        const projectResponse = createProjectResult.data;
        logger.debug('Received successful response', { 
          success: projectResponse.success 
        });
        
        try {
          const project = await projectResponse.project;
          if (project && project.id) {
            logger.info('Project created successfully', {
              projectId: project.id,
              name: project.name,
              teamIds: validatedArgs.teamIds
            });
            return {
              content: [{
                type: 'text',
                text: `Success: project created. ID: ${project.id}, Name: ${safeText(project.name)}`
              }],
              isError: false
            };
          }
        } catch (error) {
          logger.warn('Project potentially created but failed to fetch details', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        logger.warn('Project creation reported success, but project data is missing');
        return formatErrorResponse(new Error('Project creation reported success, but project data or ID is missing in the response.') as any);
      } catch (error) {
        logger.error('Unexpected error creating project', {
          error: error instanceof Error ? error.message : 'Unknown error',
          name: (args as ValidatedProjectInput).name
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

// Default export for production usage
export const LinearCreateProjectTool = createLinearCreateProjectTool();