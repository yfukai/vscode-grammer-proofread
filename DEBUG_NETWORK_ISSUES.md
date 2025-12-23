# 🔍 Debugging "API Request: Network connection failed"

## Quick Debug Steps

### 1. **Use the Built-in Debug Command**
1. Press `Cmd/Ctrl + Shift + P` to open command palette
2. Type "Grammar Proofreading: Test API Connection"
3. Run the command and check the output

This will:
- Show your current API configuration (with masked API key)
- Validate your configuration
- Test the actual API connection
- Display detailed logs in the output panel

### 2. **Check Your API Configuration**

Open VSCode Settings (`Cmd/Ctrl + ,`) and search for "Grammar Proofreading":

**Required Settings:**
- **API Endpoint**: `https://api.openai.com/v1/chat/completions` (for OpenAI)
- **API Key**: Your actual API key (starts with `sk-` for OpenAI)
- **Model**: `gpt-3.5-turbo` or `gpt-4` (must be a model you have access to)

### 3. **Common Issues & Solutions**

#### ❌ **Missing API Key**
**Error**: "API key is required"
**Solution**: Add your API key in VSCode settings

#### ❌ **Invalid API Key**
**Error**: "API request failed with status 401"
**Solution**: Verify your API key is correct and active

#### ❌ **Network/Firewall Issues**
**Error**: "Network connection failed" or "fetch failed"
**Solutions**:
- Check your internet connection
- Try from a different network
- Check if your firewall/corporate proxy blocks API calls
- Try using a VPN if behind corporate firewall

#### ❌ **Wrong Endpoint**
**Error**: "API request failed with status 404"
**Solution**: Verify the endpoint URL is correct for your API provider

#### ❌ **Rate Limiting**
**Error**: "API request failed with status 429"
**Solution**: Wait a moment and try again, or upgrade your API plan

#### ❌ **Model Access Issues**
**Error**: "API request failed with status 403" or model not found
**Solution**: Ensure you have access to the specified model

### 4. **Enable Debug Logging**

The extension now includes detailed console logging. To see it:

1. Open VSCode Developer Tools:
   - **Help** → **Toggle Developer Tools**
2. Go to the **Console** tab
3. Try using the extension
4. Look for logs starting with `[LLMApiClient]`

### 5. **Test with Different Configurations**

Try these test configurations:

#### OpenAI (Default)
```json
{
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "apiKey": "sk-your-key-here",
  "model": "gpt-3.5-turbo"
}
```

#### Azure OpenAI
```json
{
  "endpoint": "https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15",
  "apiKey": "your-azure-key",
  "model": "gpt-35-turbo"
}
```

### 6. **Manual API Test**

Test your API configuration manually using curl:

```bash
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello, test message"}
    ],
    "max_tokens": 50
  }'
```

If this fails, the issue is with your API configuration, not the extension.

### 7. **Check Extension Output**

1. Open the Output panel: **View** → **Output**
2. Select "Grammar Proofreading" from the dropdown
3. Look for error messages and debug information

### 8. **Environment Issues**

#### VSCode Version
- Ensure you're using VSCode 1.74.0 or later
- Update VSCode if needed

#### Node.js/Fetch API
- The extension uses the Fetch API
- If you see "Fetch API not available", this indicates an environment issue

### 9. **Corporate/Enterprise Networks**

If you're behind a corporate firewall:

1. **Proxy Settings**: Configure VSCode proxy settings
2. **Certificate Issues**: Your company might use custom certificates
3. **Blocked Domains**: API endpoints might be blocked
4. **VPN**: Try connecting through a VPN

### 10. **Alternative API Providers**

If OpenAI doesn't work, try other compatible providers:

- **Anthropic Claude**: `https://api.anthropic.com/v1/messages`
- **Local LLM**: Use local API endpoints like Ollama
- **Other OpenAI-compatible APIs**: Many providers offer OpenAI-compatible endpoints

## Getting Help

If none of these steps resolve the issue:

1. Run "Grammar Proofreading: Test API Connection"
2. Copy the output from the Output panel
3. Include your VSCode version and operating system
4. Share the error details (without your API key!)

The debug information will help identify the exact cause of the network connection failure.