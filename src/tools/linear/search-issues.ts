import { z } from "zod";
import { Issue, WorkflowState } from '../../generated/linear-types.js';
import enhancedClient from '../../libs/client.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { formatDate, getPriorityLabel, safeText } from '../../libs/utils.js';

/**
 * Enum for Linear issue priorities as strings for schema
 */
export const PriorityStringValues = ["no_priority", "urgent", "high", "medium", "low"] as const;

// Define string mappings for the priorities
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0,
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'low': 4
};

/**
 * Format a single issue to human readable text
 * 
 * @param issue The issue data
 * @returns Formatted human readable text
 */
function formatIssueToHumanReadable(issue: Issue): string {
  if (!issue || !issue.id) {
    return "Invalid or incomplete issue data";
  }
  
  // Build formatted output
  let result = "";
  
  // Basic issue information
  result += `Id: ${issue.id}\n`;
  result += `Title: ${safeText(issue.title)}\n`;
  
  // Improved status handling
  let statusText = "No status yet";
  if (issue.state) {
    if (typeof issue.state === 'object' && issue.state?.name) {
      statusText = issue.state.name;
    } else if (typeof issue.state === 'string') {
      // Handle case where state might be a string ID
      statusText = "Status available (ID only)";
    }
  }
  result += `Status: ${statusText}\n`;
  
  // Priority
  result += `Priority: ${getPriorityLabel(issue.priority)}\n`;
  
  // Comments count if available - use a more flexible property access
  // since it might be named differently in different API versions
  const commentsCount = (issue as Issue & { commentCount?: number; commentsCount?: number }).commentCount || 
                      (issue as Issue & { commentCount?: number; commentsCount?: number }).commentsCount || 
                      0;
  if (typeof commentsCount === 'number') {
    result += `Comments: ${commentsCount}\n`;
  }
  
  // Due date if present
  if (issue.dueDate) {
    result += `Due date: ${formatDate(issue.dueDate)}\n`;
  }
  
  // URL
  result += `Url: ${safeText(issue.url)}\n\n`;
  
  return result;
}

/**
 * Schema for search issues tool
 * Includes pagination parameters and filters
 */
const searchIssuesSchema = z.object({
  limit: z.number().optional().describe("Maximum number of issues to return (default: 50)"),
  skip: z.number().optional().describe("Number of issues to skip (default: 0)"),
  status: z.enum([
    "triage", "backlog", "todo", "in_progress", "done", "canceled"
  ]).optional().describe("Filter issues by status"),
  priority: z.enum([
    "no_priority", "urgent", "high", "medium", "low"
  ]).optional().describe("Filter issues by priority"),
  keyword: z.string().optional().describe("Filter issues by keyword in title or description"),
});

/**
 * Search issues tool implementation
 * This tool replaces the previous get-all-issues with enhanced search functionality
 */
export const LinearSearchIssuesTool = createSafeTool({
  name: "search_issues",
  description: "A tool that searches for issues in Linear",
  schema: searchIssuesSchema.shape,
  handler: async (args: z.infer<typeof searchIssuesSchema>) => {
    try {
      // Set default values for pagination
      const limit = typeof args.limit === 'number' ? args.limit : 50;
      const skip = typeof args.skip === 'number' ? args.skip : 0;
      
      // Fetch issues with pagination - we need to request more to handle skiping
      // Linear API has a first parameter but no skip/offset parameter
      const maxFetch = skip + limit;
      const getAllIssues = await enhancedClient.issues(
        {}, // Empty filter object
        maxFetch // Pass maxFetch as the 'first' parameter
      );

      if (!getAllIssues || !getAllIssues.nodes || getAllIssues.nodes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No issues found."
            },
            {
              type: "text",
              text: JSON.stringify({
                total: 0,
                limit,
                skip,
                start: 0,
                end: 0,
                hasMore: false,
                nextSkip: null,
                message: "No issues available."
              }, null, 2)
            }
          ],
        };
      }

      // Use nodes as Issue type
      const allIssues = getAllIssues.nodes as unknown as Issue[];
      
      // Filter issues by status if provided
      let filteredNodes = allIssues;
      
      if (args.status) {
        filteredNodes = filteredNodes.filter(issue => {
          // Handle case where state might be null or different structure
          if (!issue.state) return false;
          
          // Normalize the state name for comparison
          const stateName = typeof issue.state === 'object' 
            ? (issue.state as WorkflowState)?.name?.toLowerCase?.()?.replace?.(/\s+/g, '_') || ''
            : '';
          
          const targetState = args.status?.toLowerCase().replace(/\s+/g, '_') || '';
          
          return stateName.includes(targetState) || targetState.includes(stateName);
        });
      }
      
      // Filter issues by priority if provided
      if (args.priority) {
        const priorityValue = PriorityStringToNumber[args.priority];
        
        if (priorityValue !== undefined) {
          filteredNodes = filteredNodes.filter(issue => 
            issue.priority === priorityValue
          );
        }
      }
      
      // Filter issues by keyword if provided
      if (args.keyword && args.keyword.trim() !== '') {
        const keyword = args.keyword.toLowerCase().trim();
        filteredNodes = filteredNodes.filter(issue => {
          const title = (issue.title || '').toLowerCase();
          const description = (issue.description || '').toLowerCase();
          
          return title.includes(keyword) || description.includes(keyword);
        });
      }
      
      // Calculate total after filtering
      const totalFilteredIssues = filteredNodes.length;
      
      // If skip is provided, slice the nodes array to simulate pagination
      const startIndex = Math.min(skip, totalFilteredIssues);
      const endIndex = Math.min(startIndex + limit, totalFilteredIssues);
      const paginatedNodes = filteredNodes.slice(startIndex, endIndex);
      
      // Check if we have any issues to display after pagination and filtering
      if (paginatedNodes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No issues found matching the search criteria."
            },
            {
              type: "text",
              text: JSON.stringify({
                total: 0,
                filteredTotal: totalFilteredIssues,
                limit,
                skip,
                start: 0,
                end: 0,
                hasMore: false,
                nextSkip: null,
                filters: {
                  status: args.status || null,
                  priority: args.priority || null,
                  keyword: args.keyword || null
                },
                message: "No issues match the search criteria."
              }, null, 2)
            }
          ],
        };
      }
      
      // Format each issue to human readable text
      let issuesText = "";
      
      // Add search information if filters were applied
      if (args.status || args.priority || args.keyword) {
        issuesText += "Search filters:\n";
        if (args.status) issuesText += `- Status: ${args.status}\n`;
        if (args.priority) issuesText += `- Priority: ${args.priority}\n`;
        if (args.keyword) issuesText += `- Keyword: "${args.keyword}"\n`;
        issuesText += `\n`;
      }
      
      // Add note about status display limitation
      issuesText += "Note: Status display may not accurately reflect updated status due to API limitations.\n";
      issuesText += "Use 'get_issue' with specific issue ID to see accurate status information.\n\n";
      
      // Add each formatted issue
      for (const issue of paginatedNodes) {
        issuesText += formatIssueToHumanReadable(issue);
      }
      
      // Add pagination information
      const hasMoreIssues = endIndex < totalFilteredIssues;
      const nextSkip = skip + limit;
      
      // Create metadata object
      const metadataObj = {
        total: getAllIssues.nodes.length,
        filteredTotal: totalFilteredIssues,
        limit,
        skip,
        start: startIndex + 1,
        end: endIndex,
        hasMore: hasMoreIssues,
        nextSkip: hasMoreIssues ? nextSkip : null,
        filters: {
          status: args.status || null,
          priority: args.priority || null,
          keyword: args.keyword || null
        },
        message: hasMoreIssues ? `For next page, use skip: ${nextSkip}` : "No more search results available."
      };
      
      return {
        content: [
          {
            type: "text",
            text: issuesText
          },
          {
            type: "text",
            text: JSON.stringify(metadataObj, null, 2)
          }
        ],
      };
    } catch (error) {
      // Handle unexpected errors gracefully
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `An error occurred while searching for issues:\n${errorMessage}`
          },
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              errorMessage,
              total: 0,
              limit: typeof args.limit === 'number' ? args.limit : 50,
              skip: typeof args.skip === 'number' ? args.skip : 0,
              filters: {
                status: args.status || null,
                priority: args.priority || null,
                keyword: args.keyword || null
              },
              start: 0,
              end: 0,
              hasMore: false,
              nextSkip: null
            }, null, 2)
          }
        ],
      };
    }
  }
}); 