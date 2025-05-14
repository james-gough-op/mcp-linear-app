import { MockLinearResponses } from './linearResponses.js';

/**
 * Mock implementation of the Linear client for testing
 */
export class MockLinearClient {
  private mockResponses: Record<string, any> = {};
  private requestLog: any[] = [];
  
  /**
   * Configure mock to return specific responses
   * @param operation Operation name to mock
   * @param response Response to return
   */
  mockResponseFor(operation: string, response: any): void {
    this.mockResponses[operation] = response;
  }
  
  /**
   * Mock implementation of createLabel
   * @param args Label creation arguments
   * @returns Mocked response
   */
  async createLabel(args: any): Promise<any> {
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
  async issueUpdate(args: any): Promise<any> {
    // Determine which operation this is based on the args
    let operation = 'issueUpdate';
    
    if (args.labelIds) {
      operation = 'applyLabels';
    } else if (args.projectId) {
      operation = 'assignIssueToProject';
    } else if (args.cycleId) {
      operation = 'addIssueToCycle';
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
  async createProject(args: any): Promise<any> {
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
  async createIssue(args: any): Promise<any> {
    this.requestLog.push({ operation: 'createIssue', args });
    
    if (this.mockResponses.createIssue) {
      return this.mockResponses.createIssue;
    }
    
    if (args.templateId) {
      return MockLinearResponses.createIssueWithTemplateSuccess;
    } else if (args.projectId) {
      return MockLinearResponses.createIssueWithProjectSuccess;
    } else if (args.cycleId) {
      return MockLinearResponses.createIssueWithCycleSuccess;
    }
    
    return MockLinearResponses.createIssueSuccess;
  }
  
  /**
   * Utility to verify a call was made
   * @param operation Operation to verify
   * @param expectedArgs Expected arguments
   * @returns True if call was made with expected args
   */
  verifyCall(operation: string, expectedArgs?: any): boolean {
    const calls = this.requestLog.filter(r => r.operation === operation);
    
    if (calls.length === 0) return false;
    if (!expectedArgs) return true;
    
    return calls.some(call => 
      Object.entries(expectedArgs).every(([key, value]) => 
        JSON.stringify(call.args[key]) === JSON.stringify(value)
      )
    );
  }
  
  /**
   * Get number of calls made to an operation
   * @param operation Operation to check
   * @returns Number of calls
   */
  getCallCount(operation: string): number {
    return this.requestLog.filter(r => r.operation === operation).length;
  }
  
  /**
   * Reset mock state
   */
  reset(): void {
    this.mockResponses = {};
    this.requestLog = [];
  }
} 