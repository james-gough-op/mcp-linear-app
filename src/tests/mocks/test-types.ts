import { LinearErrorType } from '@linear/sdk';

/**
 * Type definitions for test mocks to avoid type errors with the real SDK types
 */

// Generic success result wrapper
export interface MockSuccessResult<T> {
  success: true;
  data: T;
  error?: undefined;
}

// Generic error result wrapper
export interface MockErrorResult {
  success: false;
  data?: undefined;
  error: MockLinearError;
}

// Simplified LinearError for testing
export class MockLinearError extends Error {
  type: LinearErrorType;
  status?: number | null;
  originalError?: Error | null;

  constructor(
    message: string,
    type: LinearErrorType,
    originalError?: Error | null,
    status?: number | null
  ) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.status = status;
  }
}

// Simplified Linear API response types for testing
export interface MockIssue {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

export interface MockComment {
  id: string;
  body: string;
  issueId: string;
  [key: string]: any;
}

export interface MockTeam {
  id: string;
  name: string;
  [key: string]: any;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

export interface MockLabel {
  id: string;
  name: string;
  color?: string;
  [key: string]: any;
}

export interface MockProject {
  id: string;
  name: string;
  [key: string]: any;
}

// Response shape wrappers
export interface MockCreateIssueResponse {
  success: boolean;
  issue: MockIssue;
}

export interface MockUpdateIssueResponse {
  success: boolean;
  issue: MockIssue;
}

export interface MockCreateCommentResponse {
  success: boolean;
  comment: MockComment;
}

export interface MockUpdateCommentResponse {
  success: boolean;
  comment: MockComment;
}

export interface MockCreateLabelResponse {
  success: boolean;
  label: MockLabel;
}

export interface MockCreateProjectResponse {
  success: boolean;
  project: MockProject;
}

export interface MockIssuesResponse {
  nodes: MockIssue[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export interface MockTeamsResponse {
  nodes: MockTeam[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export interface MockIssueCommentsResponse {
  issue: {
    comments: {
      nodes: MockComment[];
    };
  };
}

// Generic success response for operations
export interface MockSuccessActionResponse {
  success: true;
} 