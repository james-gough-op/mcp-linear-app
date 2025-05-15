import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load test environment variables
dotenv.config({ path: '.env.test' });

/**
 * Utility function to generate unique test entity names
 * @param prefix Prefix for the test entity name
 * @returns A unique test entity name with the prefix
 */
export function generateTestName(prefix: string): string {
  return `TEST_${prefix}_${uuidv4().split('-')[0]}`;
}

/**
 * Class to track created test entities for cleanup
 */
export class TestEntityTracker {
  private static entities: Map<string, string[]> = new Map([
    ['issues', []],
    ['labels', []],
    ['projects', []],
    ['cycles', []],
    ['comments', []]
  ]);

  /**
   * Track an entity for later cleanup
   * @param type Entity type
   * @param id Entity ID
   */
  static trackEntity(type: 'issues' | 'labels' | 'projects' | 'cycles' | 'comments', id: string): void {
    const entities = this.entities.get(type) || [];
    entities.push(id);
    this.entities.set(type, entities);
  }

  /**
   * Clean up all tracked entities
   */
  static async cleanup(): Promise<void> {
    // Import the Linear client and enhanced client
    const { enhancedClient } = (await import('../libs/client.js'));
    
    // Clean up comments first (as they may depend on issues)
    const comments = this.entities.get('comments') || [];
    for (const commentId of comments) {
      try {
        await enhancedClient.safeExecuteGraphQLMutation(
          `mutation DeleteComment($id: String!) {
            commentDelete(id: $id) {
              success
            }
          }`,
          { id: commentId }
        );
        console.log(`Cleaned up comment: ${commentId}`);
      } catch (error) {
        console.error(`Error cleaning up comment ${commentId}:`, error);
      }
    }
    
    // Clean up issues
    const issues = this.entities.get('issues') || [];
    for (const issueId of issues) {
      try {
        await enhancedClient.safeExecuteGraphQLMutation(
          `mutation ArchiveIssue($id: String!) {
            issueArchive(id: $id) {
              success
            }
          }`,
          { id: issueId }
        );
        console.log(`Cleaned up issue: ${issueId}`);
      } catch (error) {
        console.error(`Error cleaning up issue ${issueId}:`, error);
      }
    }
    
    // Clean up labels
    const labels = this.entities.get('labels') || [];
    for (const labelId of labels) {
      try {
        await enhancedClient.safeExecuteGraphQLMutation(
          `mutation DeleteLabel($id: String!) {
            labelDelete(id: $id) {
              success
            }
          }`,
          { id: labelId }
        );
        console.log(`Cleaned up label: ${labelId}`);
      } catch (error) {
        console.error(`Error cleaning up label ${labelId}:`, error);
      }
    }
    
    // Clean up cycles
    const cycles = this.entities.get('cycles') || [];
    for (const cycleId of cycles) {
      try {
        await enhancedClient.safeExecuteGraphQLMutation(
          `mutation ArchiveCycle($id: String!) {
            cycleArchive(id: $id) {
              success
            }
          }`,
          { id: cycleId }
        );
        console.log(`Cleaned up cycle: ${cycleId}`);
      } catch (error) {
        console.error(`Error cleaning up cycle ${cycleId}:`, error);
      }
    }
    
    // Clean up projects (do these last as they may have connected issues)
    const projects = this.entities.get('projects') || [];
    for (const projectId of projects) {
      try {
        await enhancedClient.safeExecuteGraphQLMutation(
          `mutation ArchiveProject($id: String!) {
            projectArchive(id: $id) {
              success
            }
          }`,
          { id: projectId }
        );
        console.log(`Cleaned up project: ${projectId}`);
      } catch (error) {
        console.error(`Error cleaning up project ${projectId}:`, error);
      }
    }
    
    // Reset tracked entities
    this.entities = new Map([
      ['issues', []],
      ['labels', []],
      ['projects', []],
      ['cycles', []],
      ['comments', []]
    ]);
  }
} 