# Debug API Configuration

## Step 1: Check VSCode Settings

1. Open VSCode Settings (Cmd/Ctrl + ,)
2. Search for "Grammar Proofreading"
3. Verify these settings:
   - **API Endpoint**: Should be `https://api.openai.com/v1/chat/completions` (or your custom endpoint)
   - **API Key**: Should be your actual API key (not empty)
   - **Model**: Should be `gpt-3.5-turbo` or another valid model

## Step 2: Test API Configuration Programmatically

Add this debug code to test your configuration:

```typescript
// Add to extension.ts or create a debug command
const configProvider = new ConfigurationProvider(context);
const apiConfig = configProvider.getLLMApiConfiguration();

console.log('API Configuration:', {
    endpoint: apiConfig.endpoint,
    apiKey: apiConfig.apiKey ? `${apiConfig.apiKey.substring(0, 10)}...` : 'MISSING',
    model: apiConfig.model,
    maxTokens: apiConfig.maxTokens,
    temperature: apiConfig.temperature
});

// Test validation
const apiClient = new LLMApiClient(apiConfig);
const validationErrors = apiClient.validateConfiguration();
if (validationErrors.length > 0) {
    console.error('Configuration errors:', validationErrors);
}
```

## Step 3: Common Configuration Issues

- **Missing API Key**: The default API key is empty string
- **Invalid Endpoint**: Make sure it's a valid HTTPS URL
- **Wrong Model**: Ensure the model exists and you have access
- **Network Restrictions**: Corporate firewalls might block API calls