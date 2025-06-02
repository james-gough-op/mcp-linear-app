import { IssueConnection, LinearDocument, Issue as LinearIssue } from "@linear/sdk";
import { z } from "zod";
import { getEnhancedClient } from '../../libs/client.js';
import { McpResponse, formatCatchErrorResponse, formatErrorResponse, formatValidationError } from '../../libs/error-utils.js';
import { LinearResult } from '../../libs/errors.js';
import { createLogger } from '../../libs/logger.js';
import { createSafeTool } from "../../libs/tool-utils.js";
import { safeText } from "../../libs/utils.js";

// Create a logger specific to this component
const logger = createLogger('SearchIssues');

// Define string mappings for the priorities using SDK enum values
export const PriorityStringToNumber: Record<string, number> = {
  'no_priority': 0, // None
  'urgent': 1,      // Urgent
  'high': 2,        // High
  'medium': 3,      // Medium
  'low': 4          // Low
};

const searchIssuesSchema = z.object({
  limit: z.number().int().positive().optional().default(50).describe("Max issues to return (default: 50, max: 250)"),
  skip: z.number().int().nonnegative().optional().default(0).describe("Issues to skip (default: 0)"),
  status: z.enum(["triage", "backlog", "todo", "in_progress", "done", "canceled"]).optional().describe("Filter by status"),
  priority: z.enum(["no_priority", "urgent", "high", "medium", "low"] as const).optional().describe("Filter by priority"),
  keyword: z.string().optional().describe("Filter by keyword in title/description"),
});

type ValidatedSearchInput = z.infer<typeof searchIssuesSchema>;

/**
 * Interface for search metadata representing pagination and filter details
 * This is not an SDK type - it's a custom interface specific to the search tool
 */
interface SearchMetadata {
  totalFetchedFromAPI: number;
  totalMatchingFilters: number;
  limit: number;
  skip: number;
  currentPage: number;
  totalPages: number;
  issuesOnPage: number;
  hasNextPage: boolean;
  nextSkip: number | null;
  filtersApplied: { status?: string | null; priority?: string | null; keyword?: string | null; };
}

/**
 * Format an issue for display in search results
 */
async function formatIssueForSearch(issue: LinearIssue): Promise<string> {
  const state = await issue.state; // Resolve promise
  const statusName = state?.name || "Unknown";
  const priority = issue.priority;
  return `  - ID: ${safeText(issue.id)}, Title: "${safeText(issue.title)}", Status: ${safeText(statusName)}, Priority: ${priority || 'N/A'}`;
}

// Minimal interface for DI
interface HasSafeIssues {
  safeIssues: (filter?: LinearDocument.IssueFilter, first?: number, after?: string) => Promise<LinearResult<IssueConnection>>;
}

export function createLinearSearchIssuesTool(enhancedClient: HasSafeIssues = getEnhancedClient()) {
  return createSafeTool({
    name: "search_issues",
    description: "Searches Linear issues with pagination and filtering. Returns issues and search metadata.",
    schema: searchIssuesSchema.shape,
    handler: async (args): Promise<McpResponse> => {
      // Zod validation
      const parseResult = searchIssuesSchema.safeParse(args);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return formatValidationError(firstError.path.join('.') || 'input', firstError.message);
      }
      const validatedArgs = parseResult.data;
      const {limit: argLimit = 50, skip = 0, status, priority, keyword} = validatedArgs;
      const limit = Math.min(argLimit, 250); // Cap limit

      logger.info('Starting issues search', { 
        limit, 
        skip, 
        status, 
        priority, 
        keyword 
      });

      try {
        // Fetch issues using the enhanced client
        const fetchLimit = skip + limit;
        logger.debug('Fetching issues from API', { fetchLimit });
        logger.logApiRequest('GET', 'issues', { limit: fetchLimit });
        
        const issuesResult = await enhancedClient.safeIssues({}, fetchLimit);

        if (!issuesResult.success || !issuesResult.data) {
          logger.error('Failed to fetch issues', { error: issuesResult.error?.message });
          return formatErrorResponse(issuesResult.error);
        }

        const fetchedIssues = issuesResult.data.nodes as LinearIssue[];
        const totalFetchedFromAPI = fetchedIssues.length;
        logger.info('Successfully fetched issues', { 
          count: totalFetchedFromAPI 
        });

        // Apply filters
        let filteredIssues = fetchedIssues;
        
        // Filter by status if specified
        if (status) {
          logger.debug('Filtering by status', { status });
          const targetStatus = status.toLowerCase().replace(/\s+/g, '_');
          // Filter based on resolved state names
          const issuesWithState = await Promise.all(filteredIssues.map(async issue => ({
            issue,
            state: await issue.state
          })));
          filteredIssues = issuesWithState
              .filter(({state: issueState}) =>
                  (issueState?.name?.toLowerCase?.().replace?.(/\s+/g, '_') || '').includes(targetStatus))
              .map(({issue}) => issue);
          logger.debug('Status filter applied', { 
            matchingCount: filteredIssues.length 
          });
        }
        
        // Filter by priority if specified
        if (priority) {
          logger.debug('Filtering by priority', { priority });
          const priorityValue = PriorityStringToNumber[priority];
          if (priorityValue !== undefined) {
            filteredIssues = filteredIssues.filter(issue => issue.priority === priorityValue);
            logger.debug('Priority filter applied', { 
              matchingCount: filteredIssues.length 
            });
          }
        }
        
        // Filter by keyword if specified
        if (keyword && keyword.trim() !== '') {
          logger.debug('Filtering by keyword', { keyword });
          const lcKeyword = keyword.toLowerCase().trim();
          filteredIssues = filteredIssues.filter(issue =>
              (issue.title || '').toLowerCase().includes(lcKeyword) ||
              (issue.description || '').toLowerCase().includes(lcKeyword)
          );
          logger.debug('Keyword filter applied', { 
            matchingCount: filteredIssues.length 
          });
        }
        
        const totalMatchingFilters = filteredIssues.length;

        // Apply pagination
        logger.debug('Applying pagination', { skip, limit });
        const paginatedIssues = filteredIssues.slice(skip, skip + limit);
        const issuesOnPage = paginatedIssues.length;
        const currentPage = skip === 0 ? 1 : Math.floor(skip / limit) + 1;
        const totalPages = totalMatchingFilters === 0 ? 0 : Math.ceil(totalMatchingFilters / limit);
        const hasNextPage = (skip + limit) < totalMatchingFilters;
        const nextSkip = hasNextPage ? skip + limit : null;

        // Create metadata object for search results
        const metadata: SearchMetadata = {
          totalFetchedFromAPI,
          totalMatchingFilters,
          limit,
          skip,
          currentPage,
          totalPages,
          issuesOnPage,
          hasNextPage,
          nextSkip,
          filtersApplied: {status, priority, keyword},
        };

        logger.info('Search completed successfully', { 
          totalMatching: totalMatchingFilters,
          issuesOnPage,
          currentPage,
          totalPages
        });

        // Format response text
        let responseText = "Success: Issues search results.\n";
        if (status || priority || keyword) {
          responseText += "Filters Applied:\n";
          if (status) responseText += `  - Status: ${status}\n`;
          if (priority) responseText += `  - Priority: ${priority}\n`;
          if (keyword) responseText += `  - Keyword: "${keyword}"\n`;
          responseText += "\n";
        }

        if (issuesOnPage === 0) {
          responseText += "No issues found matching your criteria for the current page.\n";
        } else {
          responseText += `Displaying ${issuesOnPage} of ${totalMatchingFilters} matching issues:\n`;
          responseText += (await Promise.all(paginatedIssues.map(issue => formatIssueForSearch(issue)))).join("\n");
        }

        // Add metadata as JSON
        responseText += `\nSearch Metadata:\n${JSON.stringify(metadata, null, 2)}`;

        // Use standardized response format
        return {
          content: [{
            type: "text",
            text: responseText
          }],
          isError: false
        };

      } catch (error) {
        logger.error('Unexpected error during issue search', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          searchParams: {
            limit,
            skip,
            status,
            priority,
            keyword
          }
        });
        return formatCatchErrorResponse(error);
      }
    }
  });
}

export const LinearSearchIssuesTool = createLinearSearchIssuesTool();
