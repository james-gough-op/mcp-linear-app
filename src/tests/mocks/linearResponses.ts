export const MockLinearResponses = {
  // Success responses
  createLabelSuccess: {
    data: {
      labelCreate: {
        success: true,
        label: {
          id: 'label_mock_123',
          name: 'Mock Label',
          color: '#FF0000',
          team: {
            id: 'team_mock_123',
            name: 'Mock Team'
          }
        }
      }
    }
  },
  
  applyLabelsSuccess: {
    data: {
      issueUpdate: {
        success: true,
        issue: {
          id: 'issue_mock_123',
          title: 'Mock Issue',
          labels: {
            nodes: [
              { id: 'label_mock_123', name: 'Mock Label 1' },
              { id: 'label_mock_456', name: 'Mock Label 2' }
            ]
          }
        }
      }
    }
  },
  
  createProjectSuccess: {
    data: {
      projectCreate: {
        success: true,
        project: {
          id: 'project_mock_123',
          name: 'Mock Project',
          description: 'Mock Project Description',
          state: 'started',
          teams: {
            nodes: [
              { id: 'team_mock_123', name: 'Mock Team' }
            ]
          }
        }
      }
    }
  },
  
  assignIssueToProjectSuccess: {
    data: {
      issueUpdate: {
        success: true,
        issue: {
          id: 'issue_mock_123',
          title: 'Mock Issue',
          project: {
            id: 'project_mock_123',
            name: 'Mock Project'
          }
        }
      }
    }
  },
  
  addIssueToCycleSuccess: {
    data: {
      issueUpdate: {
        success: true,
        issue: {
          id: 'issue_mock_123',
          title: 'Mock Issue',
          cycle: {
            id: 'cycle_mock_123',
            name: 'Mock Cycle',
            number: 4
          }
        }
      }
    }
  },
  
  issueUpdateSuccess: {
    data: {
      issueUpdate: {
        success: true,
        issue: {
          id: 'issue_mock_123',
          title: 'Mock Issue',
          description: 'Mock Issue Description',
          state: {
            id: 'state_mock_123',
            name: 'Todo'
          },
          priority: 2
        }
      }
    }
  },
  
  createIssueSuccess: {
    success: true,
    issue: {
      id: 'issue_mock_123',
      title: 'Mock Issue',
      description: 'Mock Issue Description',
      state: {
        id: 'state_mock_123',
        name: 'Todo'
      },
      priority: 2,
      team: {
        id: 'team_mock_123',
        name: 'Mock Team',
        key: 'MOCK'
      },
      project: null,
      cycle: null
    }
  },
  
  createIssueWithTemplateSuccess: {
    success: true,
    issue: {
      id: 'issue_mock_456',
      title: 'Mock Issue from Template',
      description: 'Mock Issue from Template Description',
      state: {
        id: 'state_mock_123',
        name: 'Todo'
      },
      priority: 2,
      team: {
        id: 'team_mock_123',
        name: 'Mock Team',
        key: 'MOCK'
      },
      project: null,
      cycle: null,
      lastAppliedTemplate: {
        id: 'template_mock_123',
        name: 'Mock Template'
      }
    }
  },
  
  createIssueWithProjectSuccess: {
    success: true,
    issue: {
      id: 'issue_mock_789',
      title: 'Mock Issue with Project',
      description: 'Mock Issue with Project Description',
      state: {
        id: 'state_mock_123',
        name: 'Todo'
      },
      priority: 2,
      team: {
        id: 'team_mock_123',
        name: 'Mock Team',
        key: 'MOCK'
      },
      project: {
        id: 'project_mock_123',
        name: 'Mock Project'
      },
      cycle: null
    }
  },
  
  createIssueWithCycleSuccess: {
    success: true,
    issue: {
      id: 'issue_mock_abc',
      title: 'Mock Issue with Cycle',
      description: 'Mock Issue with Cycle Description',
      state: {
        id: 'state_mock_123',
        name: 'Todo'
      },
      priority: 2,
      team: {
        id: 'team_mock_123',
        name: 'Mock Team',
        key: 'MOCK'
      },
      project: null,
      cycle: {
        id: 'cycle_mock_123',
        name: 'Mock Cycle',
        number: 4
      }
    }
  },
  
  // Error responses
  authenticationError: {
    errors: [{
      message: 'Authentication failed. Please check your Linear API key.'
    }],
    status: 401
  },
  
  permissionError: {
    errors: [{
      message: 'Permission denied. Your API key lacks permission for this operation.'
    }],
    status: 403
  },
  
  notFoundError: {
    errors: [{
      message: 'Resource not found in Linear.'
    }],
    status: 404
  },
  
  validationError: {
    errors: [{
      message: 'Validation failed: Input must be a valid UUID.'
    }],
    status: 400
  },
  
  rateLimitError: {
    errors: [{
      message: 'Rate limit exceeded. Retry after 60 seconds.'
    }],
    status: 429,
    headers: {
      'retry-after': '60'
    }
  },
  
  serverError: {
    errors: [{
      message: 'Internal server error occurred.'
    }],
    status: 500
  }
}; 