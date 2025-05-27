import {
    CommentPayload,
    Cycle,
    CycleConnection,
    CyclePayload,
    DeletePayload,
    Issue,
    IssueConnection,
    IssueLabelPayload,
    IssuePayload,
    LinearClient,
    LinearDocument,
    LinearErrorType,
    LinearRawResponse,
    Team,
    TeamConnection,
    User
} from '@linear/sdk';
import dotenv from 'dotenv';

import {
    LinearError,
    LinearResult,
    createErrorResult,
    createSuccessResult,
    logLinearError
} from './errors.js';
import { LinearEntityType, validateApiKey, validateLinearId } from './id-management.js';

// Load environment variables
dotenv.config();

// Get the API key from environment variable
const envApiKey = process.env.LINEAR_API_KEY;

class EnhancedLinearClient {
  public linearSdkClient: LinearClient;

  constructor(apiKey?: string) {
    const keyToUse = apiKey || envApiKey;
    const validatedKey = validateApiKey(keyToUse);
    if (!validatedKey.valid) {
      // Consider how to handle this: throw, log, or allow SDK to handle empty/invalid key
      console.warn(`Linear API Key issue: ${validatedKey.message || 'Validation failed.'}`);
    }
    this.linearSdkClient = new LinearClient({ apiKey: keyToUse || '' });
  }

  public get client() {
    return this.linearSdkClient.client;
  }

  public async executeGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>> {
    try {
      const response = await this.linearSdkClient.client.rawRequest<T, Record<string, unknown>>(
        query,
        variables || {}
      );
      return response as LinearRawResponse<T>;
    } catch (error) {
      throw LinearError.fromGraphQLError(error);
    }
  }

  public async executeGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearRawResponse<T>> {
    try {
      const response = await this.linearSdkClient.client.rawRequest<T, Record<string, unknown>>(
        mutation,
        variables || {}
      );
      return response as LinearRawResponse<T>;
    } catch (error) {
      throw LinearError.fromGraphQLError(error);
    }
  }

  public async safeExecuteGraphQLQuery<T>(query: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await this.executeGraphQLQuery<T>(query, variables); // Call class method
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<T>(error);
      }
      const linearError = new LinearError(
        error instanceof Error ? error.message : 'Unknown error',
        "Unknown" as LinearErrorType,
        error
      );
      return createErrorResult<T>(linearError);
    }
  }

  public async safeExecuteGraphQLMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await this.executeGraphQLMutation<T>(mutation, variables); // Call class method
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      if (error instanceof LinearError) {
        return createErrorResult<T>(error);
      }
      const linearError = new LinearError(
        error instanceof Error ? error.message : 'Unknown error',
        "Unknown" as LinearErrorType,
        error
      );
      return createErrorResult<T>(linearError);
    }
  }
  
  public async safeExecuteGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<LinearResult<T>> {
    try {
      const response = await this.linearSdkClient.client.rawRequest<T, Record<string, unknown>>(query, variables || {});
      return createSuccessResult<T>(response.data as T);
    } catch (error) {
      const linearError = LinearError.fromGraphQLError(error);
      logLinearError(linearError, { query, variables, operation: 'query/mutation'});
      return createErrorResult<T>(linearError);
    }
  }

  public async _getIssue(id: string): Promise<Issue> {
    try {
      validateLinearId(id, LinearEntityType.ISSUE);
      const query = `
        query GetIssue($issueId: String!) {
          issue(id: $issueId) {
            id
            title
            description
            number
            priority
            estimate
            branchName
            dueDate
            snoozedUntilAt
            completedAt
            canceledAt
            autoClosedAt
            archivedAt
            startedAt
            subIssueSortOrder
            createdAt
            updatedAt
            url
            boardOrder
            customerTicketCount
            stateOrder
            sortOrder
            previousIdentifiers
            teamId
            cycleId
            projectId
            projectMilestoneId
            parentId
            priorityLabel
            subscribers
            
            # Relationship fields
            labels {
              nodes {
                id
                name
                color
              }
            }
            team {
              id
              name
              key
            }
            state {
              id
              name
              color
              type
            }
            parent {
              id
              title
            }
            project {
              id
              name
            }
            cycle {
              id
              name
              number
            }
            children {
              nodes {
                id
                title
              }
            }
            assignee {
              id
              name
              displayName
              email
            }
            creator {
              id
              name
            }
          }
        }
      `;
      const variables = { issueId: id };
      const result = await this.safeExecuteGraphQLQuery<{ issue: Issue }>(query, variables);
      if (!result.success || !result.data?.issue) {
        throw new LinearError(
          result.error?.message || `Issue with ID ${id} not found`,
          result.error?.type || LinearErrorType.FeatureNotAccessible,
          result.error?.originalError
        );
      }
      return result.data.issue;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error fetching issue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeGetIssue(id: string): Promise<LinearResult<Issue>> {
    try {
      const issue = await this._getIssue(id);
      return createSuccessResult<Issue>(issue);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<Issue>(error); }
      const linearError = new LinearError(`Error in safeGetIssue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<Issue>(linearError);
    }
  }

  public async _createIssue(input: LinearDocument.IssueCreateInput): Promise<IssuePayload> {
    try {
      if (!input.teamId) { throw new LinearError('Team ID is required', LinearErrorType.InvalidInput); }
      if (!input.title) { throw new LinearError('Title is required', LinearErrorType.InvalidInput); }
      const mutation = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              creator {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              cycle {
                id
                name
                number
              }
              parent {
                id
                title
              }
            }
          }
        }
      `;
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ issueCreate: IssuePayload }>(mutation, variables);
      if (!result.success || !result.data?.issueCreate) {
        throw new LinearError(result.error?.message || 'Failed to create issue', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.issueCreate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error creating issue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeCreateIssue(input: LinearDocument.IssueCreateInput): Promise<LinearResult<IssuePayload>> {
    try {
      const resultData = await this._createIssue(input);
      return createSuccessResult<IssuePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<IssuePayload>(error); }
      const linearError = new LinearError(`Error in safeCreateIssue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<IssuePayload>(linearError);
    }
  }

  public async _updateIssue(id: string, input: LinearDocument.IssueUpdateInput): Promise<IssuePayload> {
    try {
      validateLinearId(id, LinearEntityType.ISSUE);
      if (Object.keys(input).length === 0) { throw new LinearError('At least one field must be provided for update', LinearErrorType.InvalidInput); }
      const mutation = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              creator {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              cycle {
                id
                name
                number
              }
              parent {
                id
                title
              }
            }
          }
        }
      `;
      const variables = { id, input };
      const result = await this.safeExecuteGraphQLMutation<{ issueUpdate: IssuePayload }>(mutation, variables);
      if (!result.success || !result.data?.issueUpdate) {
        throw new LinearError(result.error?.message || `Failed to update issue with ID ${id}`, result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.issueUpdate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error updating issue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeUpdateIssue(id: string, input: LinearDocument.IssueUpdateInput): Promise<LinearResult<IssuePayload>> {
    try {
      const resultData = await this._updateIssue(id, input);
      return createSuccessResult<IssuePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<IssuePayload>(error); }
      const linearError = new LinearError(`Error in safeUpdateIssue: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<IssuePayload>(linearError);
    }
  }

  public async _issues(filter?: LinearDocument.IssueFilter, first: number = 50, after?: string): Promise<IssueConnection> {
    try {
      const query = `
        query GetIssues($filter: IssueFilter, $first: Int, $after: String) {
          issues(filter: $filter, first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              title
              description
              number
              priority
              estimate
              priorityLabel
              boardOrder
              sortOrder
              startedAt
              completedAt
              canceledAt
              autoClosedAt
              archivedAt
              dueDate
              createdAt
              updatedAt
              url
              
              # Relationship fields
              state {
                id
                name
                color
                type
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              assignee {
                id
                name
                displayName
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
            }
          }
        }
      `;
      const variables = { filter, first, after };
      const result = await this.safeExecuteGraphQLQuery<{ issues: IssueConnection }>(query, variables);
      if (!result.success || !result.data?.issues) {
        throw new LinearError(result.error?.message || 'Failed to fetch issues', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.issues;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error fetching issues: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeIssues(filter?: LinearDocument.IssueFilter, first: number = 50, after?: string): Promise<LinearResult<IssueConnection>> {
    try {
      const resultData = await this._issues(filter, first, after);
      return createSuccessResult<IssueConnection>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<IssueConnection>(error); }
      const linearError = new LinearError(`Error in safeIssues: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<IssueConnection>(linearError);
    }
  }

  public async _createComment(input: LinearDocument.CommentCreateInput): Promise<CommentPayload> {
    try {
      if (!input.issueId && !input.documentContentId && !input.projectUpdateId && !input.initiativeUpdateId && !input.postId) {
        throw new LinearError('At least one context ID is required', LinearErrorType.InvalidInput);
      }
      if (!input.body) { throw new LinearError('Comment body is required', LinearErrorType.InvalidInput); }
      if (input.issueId) { validateLinearId(input.issueId, LinearEntityType.ISSUE); }
      
      const mutation = `
        mutation CreateComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              editedAt
              createdAt
              updatedAt
              user {
                id
                name
                displayName
              }
              issue {
                id
                title
                identifier
              }
            }
          }
        }
      `;
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ commentCreate: CommentPayload }>(mutation, variables);
      if (!result.success || !result.data?.commentCreate) {
        throw new LinearError(result.error?.message || 'Failed to create comment', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.commentCreate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error creating comment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeCreateComment(input: LinearDocument.CommentCreateInput): Promise<LinearResult<CommentPayload>> {
    try {
      const resultData = await this._createComment(input);
      return createSuccessResult<CommentPayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<CommentPayload>(error); }
      const linearError = new LinearError(`Error in safeCreateComment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<CommentPayload>(linearError);
    }
  }

  public async _updateComment(id: string, input: LinearDocument.CommentUpdateInput): Promise<CommentPayload> {
    try {
      validateLinearId(id, LinearEntityType.COMMENT);
      if (!input.body) { throw new LinearError('Comment body is required for update', LinearErrorType.InvalidInput); }
      const mutation = `
        mutation UpdateComment($id: String!, $input: CommentUpdateInput!) {
          commentUpdate(id: $id, input: $input) {
            success
            comment {
              id
              body
              editedAt
              createdAt
              updatedAt
              user {
                id
                name
                displayName
              }
              issue {
                id
                title
                identifier
              }
            }
          }
        }
      `;
      const variables = { id, input };
      // Note: Original used executeGraphQLMutation directly, changed to safeExecute for consistency pattern, but this means handling its Result
      const result = await this.safeExecuteGraphQLMutation<{ commentUpdate: CommentPayload }>(mutation, variables);
      if (!result.success || !result.data?.commentUpdate) {
         throw new LinearError(result.error?.message || `Failed to update comment with ID ${id}`, result.error?.type || LinearErrorType.Unknown, result.error?.originalError );
      }
      return result.data.commentUpdate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error updating comment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeUpdateComment(id: string, input: LinearDocument.CommentUpdateInput): Promise<LinearResult<CommentPayload>> {
    try {
      const resultData = await this._updateComment(id, input);
      return createSuccessResult<CommentPayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<CommentPayload>(error); }
      const linearError = new LinearError(`Error in safeUpdateComment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<CommentPayload>(linearError);
    }
  }

  public async _deleteComment(id: string): Promise<DeletePayload> {
    try {
      validateLinearId(id, LinearEntityType.COMMENT);
      const mutation = `
        mutation DeleteComment($id: String!) {
          commentDelete(id: $id) { success entityId lastSyncId }
        }
      `;
      const variables = { id };
      // Note: Original used executeGraphQLMutation directly
      const result = await this.safeExecuteGraphQLMutation<{ commentDelete: DeletePayload }>(mutation, variables);
       if (!result.success || !result.data?.commentDelete) {
        throw new LinearError(result.error?.message || `Failed to delete comment with ID ${id}`, result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.commentDelete;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeDeleteComment(id: string): Promise<LinearResult<DeletePayload>> {
    try {
      const resultData = await this._deleteComment(id);
      return createSuccessResult<DeletePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<DeletePayload>(error); }
      const linearError = new LinearError(`Error in safeDeleteComment: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<DeletePayload>(linearError);
    }
  }

  public async _createIssueLabel(input: LinearDocument.IssueLabelCreateInput): Promise<IssueLabelPayload> {
    try {
      if (!input.name) { throw new LinearError('Label name is required', LinearErrorType.InvalidInput); }
      if (!input.color) { throw new LinearError('Label color is required', LinearErrorType.InvalidInput); }
      if (input.teamId) { validateLinearId(input.teamId, LinearEntityType.TEAM); }
      const mutation = `
        mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel { id name color description isGroup createdAt updatedAt team { id name key } parent { id name } }
            lastSyncId
          }
        }
      `;
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ issueLabelCreate: IssueLabelPayload }>(mutation, variables);
      if (!result.success || !result.data?.issueLabelCreate) {
        throw new LinearError(result.error?.message || 'Failed to create issue label', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.issueLabelCreate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error creating issue label: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeCreateIssueLabel(input: LinearDocument.IssueLabelCreateInput): Promise<LinearResult<IssueLabelPayload>> {
    try {
      const resultData = await this._createIssueLabel(input);
      return createSuccessResult<IssueLabelPayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<IssueLabelPayload>(error); }
      const linearError = new LinearError(`Error in safeCreateIssueLabel: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<IssueLabelPayload>(linearError);
    }
  }

  public async _teams(filter?: LinearDocument.TeamFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<TeamConnection> {
    try {
      const query = `
        query Teams($filter: TeamFilter, $first: Int, $after: String, $includeArchived: Boolean) {
          teams(filter: $filter, first: $first, after: $after, includeArchived: $includeArchived) {
            nodes { id name key description color icon private createdAt updatedAt states { nodes { id name color type } } labels { nodes { id name color } } members { nodes { id name displayName email } } }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }
      `;
      const variables = { filter, first, after, includeArchived };
      const result = await this.safeExecuteGraphQLQuery<{ teams: TeamConnection }>(query, variables);
      if (!result.success || !result.data?.teams) {
        throw new LinearError(result.error?.message || 'Failed to fetch teams', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.teams;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error fetching teams: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeTeams(filter?: LinearDocument.TeamFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<LinearResult<TeamConnection>> {
    try {
      const resultData = await this._teams(filter, first, after, includeArchived);
      return createSuccessResult<TeamConnection>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<TeamConnection>(error); }
      const linearError = new LinearError(`Error in safeTeams: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<TeamConnection>(linearError);
    }
  }

  public async _team(id: string): Promise<Team> {
    try {
      validateLinearId(id, LinearEntityType.TEAM);
      const query = `
        query GetTeam($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            description
            color
            icon
            private
            createdAt
            updatedAt
            states { nodes { id name color type } }
            labels { nodes { id name color } }
            members { nodes { id name displayName email } }
          }
        }
      `;
      const variables = { teamId: id };
      const result = await this.safeExecuteGraphQLQuery<{ team: Team }>(query, variables);
      if (!result.success || !result.data?.team) {
        throw new LinearError(result.error?.message || `Team with ID ${id} not found`, result.error?.type || LinearErrorType.FeatureNotAccessible, result.error?.originalError);
      }
      return result.data.team;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error fetching team: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeTeam(id: string): Promise<LinearResult<Team>> {
    try {
      const team = await this._team(id);
      return createSuccessResult<Team>(team);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<Team>(error); }
      const linearError = new LinearError(`Error in safeTeam: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<Team>(linearError);
    }
  }

  public async _getViewer(): Promise<User> {
    try {
      const query = `
        query Viewer {
          viewer {
            id
            name
            displayName
            email
            active
            admin
            avatarUrl
            createdAt
            updatedAt
            lastSeen
            organizationId
            organization { id name urlKey }
            teams { nodes { id name key } }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLQuery<{ viewer: User }>(query);
      if (!result.success || !result.data?.viewer) {
        throw new LinearError(result.error?.message || 'Failed to fetch viewer profile', result.error?.type || LinearErrorType.AuthenticationError, result.error?.originalError);
      }
      return result.data.viewer;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error fetching viewer profile: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.AuthenticationError, error);
    }
  }
  public async safeGetViewer(): Promise<LinearResult<User>> {
    try {
      const user = await this._getViewer();
      return createSuccessResult<User>(user);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<User>(error); }
      const linearError = new LinearError(`Error in safeGetViewer: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.AuthenticationError, error);
      return createErrorResult<User>(linearError);
    }
  }
  
  public async _cycle(id: string): Promise<Cycle> {
    if (!id || id.trim() === '') { throw new LinearError('Cycle ID cannot be empty', LinearErrorType.InvalidInput); }
    try {
      validateLinearId(id, LinearEntityType.CYCLE);
      const query = `
        query GetCycle($id: ID!) {
          cycle(id: $id) {
            id
            name
            number
            startsAt
            endsAt
            completedAt
            description
            team {
              id
              name
              key
            }
            issues {
              nodes {
                id
                identifier
                title
              }
            }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLQuery<{ cycle: Cycle }>(query, { id });
      if (!result.success || !result.data?.cycle) {
        throw new LinearError(result.error?.message || `Cycle with ID ${id} not found`, result.error?.type || LinearErrorType.FeatureNotAccessible, result.error?.originalError);
      }
      return result.data.cycle;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Failed to fetch cycle with ID ${id}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeCycle(id: string): Promise<LinearResult<Cycle>> {
    try {
      const cycle = await this._cycle(id);
      return createSuccessResult<Cycle>(cycle);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<Cycle>(error); }
      return createErrorResult<Cycle>(new LinearError('Failed to fetch cycle', LinearErrorType.Unknown, error));
    }
  }

  public async _cycles(filter?: LinearDocument.CycleFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<CycleConnection> {
    try {
      const query = `
        query GetCycles($filter: CycleFilter, $first: Int, $after: String, $includeArchived: Boolean) {
          cycles(filter: $filter, first: $first, after: $after, includeArchived: $includeArchived) {
            nodes { id name number startsAt endsAt completedAt description team { id name key } }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLQuery<{ cycles: CycleConnection }>(query, { filter, first, after, includeArchived });
      if (!result.success || !result.data?.cycles) {
        throw new LinearError(result.error?.message || 'Failed to fetch cycles', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.cycles;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError('Failed to fetch cycles', LinearErrorType.Unknown, error);
    }
  }
  public async safeCycles(filter?: LinearDocument.CycleFilter, first: number = 50, after?: string, includeArchived: boolean = false): Promise<LinearResult<CycleConnection>> {
    try {
      const cycles = await this._cycles(filter, first, after, includeArchived);
      return createSuccessResult<CycleConnection>(cycles);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<CycleConnection>(error); }
      return createErrorResult<CycleConnection>(new LinearError('Failed to fetch cycles', LinearErrorType.Unknown, error));
    }
  }

  public async _createCycle(input: LinearDocument.CycleCreateInput): Promise<CyclePayload> {
    if (!input.teamId) { throw new LinearError('Team ID is required to create a cycle', LinearErrorType.InvalidInput); }
    try {
      if (input.teamId) { validateLinearId(input.teamId, LinearEntityType.TEAM); }
      const mutation = `
        mutation CreateCycle($input: CycleCreateInput!) {
          cycleCreate(input: $input) {
            success
            cycle { id name number startsAt endsAt completedAt description team { id name key } }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLMutation<{ cycleCreate: CyclePayload }>(mutation, { input });
      if (!result.success || !result.data?.cycleCreate) {
        throw new LinearError(result.error?.message || 'Failed to create cycle', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.cycleCreate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError('Failed to create cycle', LinearErrorType.Unknown, error);
    }
  }
  public async safeCreateCycle(input: LinearDocument.CycleCreateInput): Promise<LinearResult<CyclePayload>> {
    try {
      const resultData = await this._createCycle(input);
      return createSuccessResult<CyclePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<CyclePayload>(error); }
      return createErrorResult<CyclePayload>(new LinearError('Failed to create cycle', LinearErrorType.Unknown, error));
    }
  }

  public async _updateCycle(id: string, input: LinearDocument.CycleUpdateInput): Promise<CyclePayload> {
    if (!id || id.trim() === '') { throw new LinearError('Cycle ID cannot be empty', LinearErrorType.InvalidInput); }
    try {
      validateLinearId(id, LinearEntityType.CYCLE);
      const mutation = `
        mutation UpdateCycle($id: ID!, $input: CycleUpdateInput!) {
          cycleUpdate(id: $id, input: $input) {
            success
            cycle { id name number startsAt endsAt completedAt description team { id name key } }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLMutation<{ cycleUpdate: CyclePayload }>(mutation, { id, input });
      if (!result.success || !result.data?.cycleUpdate) {
        throw new LinearError(result.error?.message || `Failed to update cycle with ID ${id}`, result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.cycleUpdate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Failed to update cycle with ID ${id}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeUpdateCycle(id: string, input: LinearDocument.CycleUpdateInput): Promise<LinearResult<CyclePayload>> {
    try {
      const resultData = await this._updateCycle(id, input);
      return createSuccessResult<CyclePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<CyclePayload>(error); }
      return createErrorResult<CyclePayload>(new LinearError(`Failed to update cycle with ID ${id}`, LinearErrorType.Unknown, error));
    }
  }

  public async _addIssueToCycle(issueId: string, cycleId: string): Promise<IssuePayload> {
    if (!issueId || issueId.trim() === '') { throw new LinearError('Issue ID cannot be empty', LinearErrorType.InvalidInput); }
    if (!cycleId || cycleId.trim() === '') { throw new LinearError('Cycle ID cannot be empty', LinearErrorType.InvalidInput); }
    try {
      validateLinearId(issueId, LinearEntityType.ISSUE);
      validateLinearId(cycleId, LinearEntityType.CYCLE);
      const mutation = `
        mutation AddIssueToCycle($issueId: ID!, $cycleId: ID!) {
          issueUpdate(id: $issueId, input: { cycleId: $cycleId }) {
            success
            issue { id identifier title cycle { id name number startsAt endsAt } }
          }
        }
      `;
      const result = await this.safeExecuteGraphQLMutation<{ issueUpdate: IssuePayload }>(mutation, { issueId, cycleId });
      if (!result.success || !result.data?.issueUpdate) {
        throw new LinearError(result.error?.message || 'Failed to add issue to cycle', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.issueUpdate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError('Failed to add issue to cycle', LinearErrorType.Unknown, error);
    }
  }
  public async safeAddIssueToCycle(issueId: string, cycleId: string): Promise<LinearResult<IssuePayload>> {
    try {
      const resultData = await this._addIssueToCycle(issueId, cycleId);
      return createSuccessResult<IssuePayload>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<IssuePayload>(error); }
      return createErrorResult<IssuePayload>(new LinearError('Failed to add issue to cycle', LinearErrorType.Unknown, error));
    }
  }

  public async testAuthentication(): Promise<LinearResult<Record<string, unknown>>> {
    try {
      const query = `query { viewer { email } }`;
      const result = await this.safeExecuteGraphQLQuery<Record<string, unknown>>(query);
      return result;
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<Record<string, unknown>>(error); }
      const linearError = new LinearError(error instanceof Error ? error.message : 'Unknown authentication error', LinearErrorType.AuthenticationError, error);
      return createErrorResult<Record<string, unknown>>(linearError);
    }
  }

  // --- PROJECT CREATION ---
  public async _createProject(input: LinearDocument.ProjectCreateInput): Promise<any> {
    try {
      if (!input.name) { throw new LinearError('Project name is required', LinearErrorType.InvalidInput); }
      if (!input.teamIds || input.teamIds.length === 0) { throw new LinearError('At least one team ID is required', LinearErrorType.InvalidInput); }
      const mutation = `
        mutation CreateProject($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project {
              id
              name
              description
              color
              state
              createdAt
              updatedAt
              team {
                id
                name
              }
            }
          }
        }
      `;
      const variables = { input };
      const result = await this.safeExecuteGraphQLMutation<{ projectCreate: any }>(mutation, variables);
      if (!result.success || !result.data?.projectCreate) {
        throw new LinearError(result.error?.message || 'Failed to create project', result.error?.type || LinearErrorType.Unknown, result.error?.originalError);
      }
      return result.data.projectCreate;
    } catch (error) {
      if (error instanceof LinearError) { throw error; }
      throw new LinearError(`Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
    }
  }
  public async safeCreateProject(input: LinearDocument.ProjectCreateInput): Promise<LinearResult<any>> {
    try {
      const resultData = await this._createProject(input);
      return createSuccessResult<any>(resultData);
    } catch (error) {
      if (error instanceof LinearError) { return createErrorResult<any>(error); }
      const linearError = new LinearError(`Error in safeCreateProject: ${error instanceof Error ? error.message : 'Unknown error'}`, LinearErrorType.Unknown, error);
      return createErrorResult<any>(linearError);
    }
  }
}

// Factory function for DI
export function getEnhancedClient(apiKey?: string) {
  return new EnhancedLinearClient(apiKey);
}

// Default export for backward compatibility with tests
const enhancedClient = new EnhancedLinearClient();
export default enhancedClient;
export { EnhancedLinearClient };
