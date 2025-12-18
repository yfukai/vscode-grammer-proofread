# Grammar Proofreading Extension

A VSCode extension that provides grammar correction and proofreading capabilities using Large Language Models (LLM). The extension integrates with OpenAI-compatible APIs to analyze and improve text quality through predefined prompts, returning structured corrections with explanations.

## Features

- **Grammar Correction**: Fix grammatical errors, verb tenses, and sentence structure
- **Style Improvement**: Enhance word choice, flow, and readability
- **Clarity Enhancement**: Simplify complex sentences and remove ambiguity
- **Tone Adjustment**: Ensure appropriate and consistent tone
- **Custom Corrections**: Provide your own correction instructions
- **Detailed Explanations**: View explanations for all changes made
- **Context Menu Integration**: Access corrections directly from the editor
- **Progress Indicators**: Visual feedback during correction process
- **Undo Support**: Easy undo of corrections

## Installation

1. Install the extension from the VSCode marketplace
2. Configure your API settings (see Configuration section below)
3. Start correcting text!

## Usage

### Quick Start

1. Open any text document in VSCode
2. Select text you want to correct (or leave unselected to correct entire document)
3. Right-click and choose from the grammar correction options:
   - **Correct Grammar**: Fix grammatical errors
   - **Correct Style**: Improve writing style
   - **Correct Clarity**: Enhance clarity and readability
   - **Correct Tone**: Adjust tone appropriately
   - **Custom Correction**: Provide custom instructions

### Command Palette

You can also access corrections via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
- `Grammar Proofreading: Correct Grammar`
- `Grammar Proofreading: Correct Style`
- `Grammar Proofreading: Correct Clarity`
- `Grammar Proofreading: Correct Tone`
- `Grammar Proofreading: Custom Correction`
- `Grammar Proofreading: Open Settings`

## Configuration

### Required Settings

Before using the extension, you must configure your API settings:

1. Open VSCode Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Grammar Proofreading"
3. Configure the following required settings:

#### API Key
- **Setting**: `grammarProofreading.apiKey`
- **Description**: Your OpenAI API key or compatible service API key
- **Required**: Yes

#### API Endpoint
- **Setting**: `grammarProofreading.apiEndpoint`
- **Default**: `https://api.openai.com/v1/chat/completions`
- **Description**: The API endpoint for your LLM service

### Optional Settings

#### Model
- **Setting**: `grammarProofreading.model`
- **Default**: `gpt-3.5-turbo`
- **Description**: The model to use for corrections

#### Max Tokens
- **Setting**: `grammarProofreading.maxTokens`
- **Default**: `1000`
- **Description**: Maximum tokens for API responses

#### Temperature
- **Setting**: `grammarProofreading.temperature`
- **Default**: `0.3`
- **Description**: Temperature for API requests (0.0 to 2.0)

### Configurable Default Prompts

You can customize the default prompts used for each correction type to match your writing style and preferences:

#### Grammar Prompt
- **Setting**: `grammarProofreading.defaultPrompts.grammar`
- **Description**: Customize the prompt used for grammar corrections
- **Default**: Focuses on subject-verb agreement, verb tenses, punctuation, and sentence structure

#### Style Prompt
- **Setting**: `grammarProofreading.defaultPrompts.style`
- **Description**: Customize the prompt used for style improvements
- **Default**: Focuses on word choice, sentence variety, clarity, and professional tone

#### Clarity Prompt
- **Setting**: `grammarProofreading.defaultPrompts.clarity`
- **Description**: Customize the prompt used for clarity enhancements
- **Default**: Focuses on simplifying complex sentences and removing ambiguity

#### Tone Prompt
- **Setting**: `grammarProofreading.defaultPrompts.tone`
- **Description**: Customize the prompt used for tone adjustments
- **Default**: Focuses on consistency in formality and appropriate voice

#### Customizing Prompts

To customize a default prompt:

1. Open VSCode Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Grammar Proofreading"
3. Find the prompt setting you want to modify (e.g., `grammarProofreading.defaultPrompts.grammar`)
4. Click "Edit in settings.json" or use the text area to modify the prompt
5. Save your changes

**Example Custom Grammar Prompt:**
```
Please correct any grammatical errors in the following text with a focus on:
- British English spelling and grammar rules
- Formal academic writing style
- Proper citation formatting
- Technical terminology accuracy
Preserve the original meaning and maintain an academic tone.
```

**Tips for Writing Effective Prompts:**
- Be specific about what you want corrected
- Include style preferences (formal/informal, British/American English, etc.)
- Mention what should be preserved (tone, meaning, technical terms)
- Use bullet points for clarity
- Test your prompts with sample text to ensure they work as expected

#### Resetting Prompts

To reset a prompt to its default value:
1. Go to the prompt setting in VSCode Settings
2. Click the gear icon next to the setting
3. Select "Reset Setting" from the dropdown menu

### Supported APIs

This extension works with any OpenAI-compatible API, including:
- OpenAI GPT models
- Azure OpenAI Service
- Local LLM servers (like Ollama, LM Studio)
- Other compatible services

## Requirements

- VSCode 1.74.0 or higher
- OpenAI-compatible API access
- Internet connection (for API calls)

## Troubleshooting

### Common Issues

**"API key is not configured"**
- Solution: Set your API key in the extension settings

**"No active editor found"**
- Solution: Open a text document and ensure it has focus

**"No text to process"**
- Solution: Either select text or ensure the document has content

**"API request failed"**
- Check your API key is correct
- Verify your API endpoint is accessible
- Ensure you have sufficient API credits/quota

### Getting Help

If you encounter issues:
1. Check the extension settings are configured correctly
2. Try the "Test Connection" feature in settings
3. Check the VSCode Developer Console for error messages
4. Report issues on the GitHub repository

## Privacy and Security

- Your text is sent to the configured API endpoint for processing
- API keys are stored securely in VSCode settings
- No text or corrections are stored locally by this extension
- Review your API provider's privacy policy for data handling

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run compile
```

### Test

```bash
npm test
```

### Package

```bash
npm run vsce:package
```

### Publish

```bash
npm run vsce:publish
```

### Packaging for VSCode

```bash
npm install -g @vscode/vsce
vsce package
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Release Notes

### 0.0.2

New features:
- **Configurable Default Prompts**: Customize the default prompts for grammar, style, clarity, and tone corrections through VSCode settings
- **Prompt Validation**: Built-in validation ensures prompt content meets quality requirements
- **Prompt Reset Functionality**: Easy reset of customized prompts back to built-in defaults
- **Enhanced Settings UI**: Multiline text editing for prompts with clear descriptions
- **Improved Error Handling**: Better validation and error messages for prompt configuration

### 0.0.1

Initial release featuring:
- Grammar, style, clarity, and tone corrections
- Custom correction prompts
- OpenAI-compatible API integration
- Detailed correction explanations
- Context menu and command palette integration
- Comprehensive error handling and user feedback