import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";

// Import RequestHandlerExtra and CallToolResult from the correct locations
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Standard tool response format
 */
export type ToolResponse = CallToolResult;

/**
 * Defines the raw handler function that users will implement
 * No need for try-catch blocks as error handling is done automatically
 */
export type RawToolHandler<T = { [key: string]: unknown }> = (
  args: T, 
  extra: RequestHandlerExtra
) => Promise<CallToolResult | string> | CallToolResult | string;

/**
 * Defines the structure of a tool that can be registered with the MCP server
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodRawShape;
  handler: (args: { [x: string]: unknown }, extra: RequestHandlerExtra) => Promise<CallToolResult>;
}

/**
 * A tool definition with automatic error handling
 */
export interface SafeToolDefinition<T extends ZodRawShape> {
  name: string;
  description: string;
  schema: T;
  handler: RawToolHandler<z.infer<z.ZodObject<T>>>;
}

/**
 * Creates a safe tool with automatic error handling
 * @param toolDef - The tool definition with a simpler handler
 * @returns A complete ToolDefinition with error handling
 */
export function createSafeTool<T extends ZodRawShape>(
  toolDef: SafeToolDefinition<T>
): ToolDefinition {
  // Create a Zod object from the schema
  const zodSchema = z.object(toolDef.schema);
  
  // Return the tool definition with wrapped handler that includes error handling
  return {
    name: toolDef.name,
    description: toolDef.description,
    schema: toolDef.schema,
    handler: async (args: { [x: string]: unknown }, extra: RequestHandlerExtra): Promise<CallToolResult> => {
      try {
        // First, validate and parse the input arguments
        const validatedArgs = zodSchema.parse(args);
        
        // Execute the handler and handle various return types
        let result = await toolDef.handler(validatedArgs, extra);
        
        // If the result is a string, convert it to a proper ToolResponse
        if (typeof result === 'string') {
          result = createTextResponse(result);
        }
        
        return result;
      } catch (error) {
        // Handle Zod validation errors specifically
        if (error instanceof z.ZodError) {
          return {
            content: [{
              type: "text",
              text: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            }],
            isError: true,
            _meta: {
              errorType: 'ValidationError',
              validationErrors: error.errors,
              timestamp: new Date().toISOString()
            }
          };
        }
        
        // Handle any other errors
        return {
          content: [{
            type: "text",
            text: `Error in tool ${toolDef.name}: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
          _meta: {
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
          }
        };
      }
    }
  };
}

/**
 * Registers one or multiple tools with the MCP server
 * @param server - The MCP server instance
 * @param tools - A single tool definition or an array of tool definitions
 */
export function registerTool(
  server: McpServer,
  tools: ToolDefinition | ToolDefinition[]
): void {
  const toolArray = Array.isArray(tools) ? tools : [tools];
  
  for (const { name, description, schema, handler } of toolArray) {
    server.tool(name, description, schema, handler);
  }
}

/**
 * Enhances the McpServer class with a method to register tools using a single object
 * This adds the ability to use server.tool(anyTool) syntax
 */
export function enhanceMcpServer(): void {
  // Store the original tool method
  const originalTool = McpServer.prototype.tool;
  
  // Replace it with our enhanced version that accepts either the original arguments or a tool object
  // @ts-expect-error - Intentional prototype modification
  McpServer.prototype.tool = function(
    nameOrTool: string | ToolDefinition,
    description?: string,
    schema?: ZodRawShape,
    handler?: (args: { [x: string]: unknown }, extra: RequestHandlerExtra) => Promise<CallToolResult>
  ): void {
    // Check if first argument is a ToolDefinition
    if (
      typeof nameOrTool === "object" && 
      nameOrTool !== null &&
      "name" in nameOrTool && 
      "description" in nameOrTool && 
      "schema" in nameOrTool && 
      "handler" in nameOrTool
    ) {
      const tool = nameOrTool as ToolDefinition;
      return originalTool.call(this, tool.name, tool.description, tool.schema, tool.handler);
    }
    
    // Validate arguments for standard call format
    if (typeof nameOrTool !== "string") {
      throw new TypeError("First argument must be a string when not using object syntax");
    }
    
    if (!description) {
      throw new Error("Description is required when using standard syntax");
    }
    
    if (!schema) {
      throw new Error("Schema is required when using standard syntax");
    }
    
    if (!handler) {
      throw new Error("Handler is required when using standard syntax");
    }
    
    return originalTool.call(this, nameOrTool, description, schema, handler);
  };
}

/**
 * Creates a text response for a tool
 * @param text - The text to include in the response
 * @returns A properly formatted tool response
 */
export function createTextResponse(text: string): CallToolResult {
  return {
    content: [{
      type: "text",
      text
    }]
  };
}

/**
 * Creates an error response
 * @param message - The error message
 * @param metadata - Optional additional metadata
 * @returns A properly formatted error response
 */
export function createErrorResponse(message: string, metadata?: Record<string, unknown>): CallToolResult {
  return {
    content: [{
      type: "text",
      text: message
    }],
    isError: true,
    _meta: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}