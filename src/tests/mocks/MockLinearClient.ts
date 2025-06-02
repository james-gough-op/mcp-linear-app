import { vi } from 'vitest';
import { LinearResult } from '../../libs/errors.js';
import { MockLinearResponses } from './linearResponses.js';

/**
 * Mock implementation of the Linear client for testing
 */
export class MockLinearClient {
  private mockResponses: Record<string, unknown> = {};
  private requestLog: unknown[] = [];
  
  /**
   * Configure mock to return specific responses
   * @param operation Operation name to mock
   * @param response Response to return
   */
  mockResponseFor(operation: string, response: unknown): void {
    this.mockResponses[operation] = response;
  }
  
  /**
   * Safe version of createIssue that follows the LinearResult pattern
   * @param args Issue creation arguments
   * @returns Promise of LinearResult with issue payload
   */
  safeCreateIssue = vi.fn().mockImplementation(async (args: unknown): Promise<LinearResult<unknown>> => {
    this.requestLog.push({ operation: 'safeCreateIssue', args });
    
    if (this.mockResponses.safeCreateIssue) {
      return this.mockResponses.safeCreateIssue as LinearResult<unknown>;
    }
    
    // Default is to return a successful result
    return {
      success: true,
      data: await this.createIssue(args),
      error: undefined
    };
  });
  
  /**
   * Safe version of createIssueLabel that follows the LinearResult pattern
   * @param args Label creation arguments
   * @returns Promise of LinearResult with label payload
   */
  safeCreateIssueLabel = vi.fn().mockImplementation(async (args: unknown): Promise<LinearResult<unknown>> => {
    this.requestLog.push({ operation: 'safeCreateIssueLabel', args });
    
    if (this.mockResponses.safeCreateIssueLabel) {
      return this.mockResponses.safeCreateIssueLabel as LinearResult<unknown>;
    }
    
    // Default is to return a successful result
    return {
      success: true,
      data: await this.createLabel(args),
      error: undefined
    };
  });
  
  /**
   * Mock implementation of createLabel
   * @param args Label creation arguments
   * @returns Mocked response
   */
  async createLabel(args: unknown): Promise<unknown> {
    this.requestLog.push({ operation: 'createLabel', args });
    
    if (this.mockResponses.createLabel) {
      return this.mockResponses.createLabel;
    }
    
    // Default mock response
    return MockLinearResponses.createLabelSuccess;
  }
  
  /**
   * Mock implementation of issueUpdate for applying labels
   * @param args Issue update arguments for labels
   * @returns Mocked response
   */
  async issueUpdate(args: unknown): Promise<unknown> {
    // Determine which operation this is based on the args
    let operation = 'issueUpdate';
    
    if (typeof args === 'object' && args !== null) {
      if ('labelIds' in args) {
        operation = 'applyLabels';
      } else if ('projectId' in args) {
        operation = 'assignIssueToProject';
      } else if ('cycleId' in args) {
        operation = 'addIssueToCycle';
      }
    }
    
    this.requestLog.push({ operation, args });
    
    if (this.mockResponses[operation]) {
      return this.mockResponses[operation];
    }
    
    // Return appropriate default mock response based on operation
    switch (operation) {
      case 'applyLabels':
        return MockLinearResponses.applyLabelsSuccess;
      case 'assignIssueToProject':
        return MockLinearResponses.assignIssueToProjectSuccess;
      case 'addIssueToCycle':
        return MockLinearResponses.addIssueToCycleSuccess;
      default:
        return MockLinearResponses.issueUpdateSuccess;
    }
  }
  
  /**
   * Mock implementation of createProject
   * @param args Project creation arguments
   * @returns Mocked response
   */
  async createProject(args: unknown): Promise<unknown> {
    this.requestLog.push({ operation: 'createProject', args });
    
    if (this.mockResponses.createProject) {
      return this.mockResponses.createProject;
    }
    
    return MockLinearResponses.createProjectSuccess;
  }
  
  /**
   * Mock implementation of createIssue
   * @param args Issue creation arguments
   * @returns Mocked response
   */
  async createIssue(args: unknown): Promise<unknown> {
    this.requestLog.push({ operation: 'createIssue', args });
    
    if (this.mockResponses.createIssue) {
      return this.mockResponses.createIssue;
    }
    
    if (typeof args === 'object' && args !== null) {
      if ('templateId' in args) {
        return MockLinearResponses.createIssueWithTemplateSuccess;
      } else if ('projectId' in args) {
        return MockLinearResponses.createIssueWithProjectSuccess;
      } else if ('cycleId' in args) {
        return MockLinearResponses.createIssueWithCycleSuccess;
      }
    }
    
    return MockLinearResponses.createIssueSuccess;
  }
  
  /**
   * Utility to verify a call was made
   * @param operation Operation to verify
   * @param expectedArgs Expected arguments
   * @returns True if call was made with expected args
   */
  verifyCall(operation: string, expectedArgs?: unknown): boolean {
    const calls = (this.requestLog as Array<unknown>).filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && 'operation' in r && typeof (r as Record<string, unknown>).operation === 'string' && (r as Record<string, unknown>).operation === operation);
    
    if (calls.length === 0) return false;
    if (!expectedArgs) return true;
    
    return calls.some((call): call is Record<string, unknown> => typeof call === 'object' && call !== null && 'args' in call);
  }
  
  /**
   * Get number of calls made to an operation
   * @param operation Operation to check
   * @returns Number of calls
   */
  getCallCount(operation: string): number {
    return (this.requestLog as Array<unknown>).filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && 'operation' in r && typeof (r as Record<string, unknown>).operation === 'string' && (r as Record<string, unknown>).operation === operation).length;
  }
  
  /**
   * Reset mock state
   */
  reset(): void {
    this.mockResponses = {};
    this.requestLog = [];
    vi.clearAllMocks();
  }
} 