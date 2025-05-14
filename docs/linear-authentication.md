# Linear API Authentication

This document explains how to set up and configure authentication for the Linear API in the MCP Server.

## Prerequisites

- A Linear account with administrator access to your workspace
- Node.js and npm/pnpm installed

## Obtaining a Linear API Key

1. Log in to your Linear account at [https://linear.app](https://linear.app)
2. Click on your profile picture in the bottom left corner
3. Select "Settings" from the menu
4. Navigate to the "API" section in the left sidebar
5. Click "Create Key" to generate a new Personal API Key
6. Enter a description for the key (e.g., "MCP Server Integration")
7. Copy the API key displayed (Note: Linear API keys start with `lin_api_`)
8. Store this key securely as it will not be shown again

## Configuring the MCP Server

The MCP Server uses environment variables to securely store API keys. Follow these steps to set up authentication:

1. Create a `.env` file in the root directory of the project by copying the example file:
   ```
   cp .env.example .env
   ```

2. Open the `.env` file and replace the placeholder value with your actual Linear API key:
   ```
   LINEAR_API_KEY=lin_api_your_actual_key_here
   ```

3. Save the file and ensure it is not committed to version control (it should be included in `.gitignore`)

## Verifying Authentication

To verify that your API key is configured correctly:

1. Run the authentication test:
   ```
   npm run test:auth
   ```

2. If successful, you should see output confirming successful authentication with the Linear API.

## Authentication Error Handling

The MCP Server validates your Linear API key at startup:

- If the key is missing, the server will fail to start with an error message
- If the key has an invalid format, the server will fail to start with a validation error
- If the key is valid in format but unauthorized, authentication failures will be logged

## Troubleshooting

### API Key Is Not Set

Error: `LINEAR_API_KEY environment variable is not set. Please add it to your .env file.`

Solution:
- Ensure you have created a `.env` file in the root directory
- Check that the file contains the `LINEAR_API_KEY` variable
- Make sure the environment is loading correctly (no syntax errors in `.env`)

### Invalid API Key Format

Error: `LINEAR_API_KEY has an invalid format. Linear API keys should start with "lin_api_" followed by alphanumeric characters.`

Solution:
- Check that the API key starts with `lin_api_`
- Ensure you copied the entire key without extra spaces
- Regenerate a new key if necessary

### Authentication Failures

Error: `Authentication failed: Invalid API key` or similar

Solution:
- Verify the key has the necessary permissions in Linear
- Check if the key has been revoked or expired
- Generate a new key with appropriate permissions

## Security Considerations

- **Do not** commit your `.env` file to version control
- **Do not** share your Linear API key publicly
- Consider using different API keys for development and production
- Regularly rotate API keys following security best practices
- Use environment-specific keys with the minimum required permissions 