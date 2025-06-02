import { LinearErrorType } from '@linear/sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearGetProfileTool } from '../tools/linear/get-profile.js';
import {
    createMockClient,
    createSuccessResponse,
    expectErrorResponse,
    expectSuccessResponse,
    mockApiResponses,
    mockUserData
} from './utils/test-utils.js';

describe('LinearGetProfileTool', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it('should successfully get the user profile', async () => {
    mockClient.safeGetViewer.mockResolvedValueOnce(
      createSuccessResponse(mockUserData)
    );
    
    const tool = createLinearGetProfileTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectSuccessResponse(response);
    expect(response.content[0].text).toContain('Success: Profile data retrieved');
    expect(mockClient.safeGetViewer).toHaveBeenCalled();
  });

  it('should handle error from safeGetViewer', async () => {
    mockClient.safeGetViewer.mockResolvedValueOnce(
      mockApiResponses.mockErrorResponse('Profile fetch failed', LinearErrorType.Unknown)
    );
    
    const tool = createLinearGetProfileTool(mockClient);
    const response = await tool.handler({}, { signal: new AbortController().signal });
    
    expectErrorResponse(response, 'error');
    expect(response.content[0].text).toContain('Profile fetch failed');
  });
}); 