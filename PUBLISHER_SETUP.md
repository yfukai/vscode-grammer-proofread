# Publisher Setup for VSCode Extension

## Current Status
The extension is currently using a placeholder publisher name: `test-publisher`

## For Production Use

To publish this extension to the VSCode Marketplace, you'll need to:

### 1. Create a Publisher Account
1. Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Create a new publisher with a unique name

### 2. Update package.json
Replace the placeholder publisher name:

```json
{
  "publisher": "your-actual-publisher-name"
}
```

### 3. Publisher Name Requirements
- Must be unique across the marketplace
- Only alphanumeric characters, hyphens, and underscores allowed
- Cannot start or end with a hyphen
- Must be between 4-256 characters

### 4. Extension ID Format
The final extension ID will be: `your-publisher-name.grammar-proofreading-extension`

## For Development/Testing
The current placeholder `test-publisher` works fine for:
- Local development
- Debugging (F5)
- Creating VSIX packages for testing
- Installing locally with `code --install-extension grammar-proofreading-extension-0.0.1.vsix`

## Common Publisher Names
Examples of valid publisher names:
- `microsoft`
- `ms-vscode`
- `github`
- `your-company-name`
- `your_username`
- `yourname-extensions`