# Change Log

All notable changes to the "Grammar Proofreading Extension" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-12-18

### Added
- Initial release of Grammar Proofreading Extension
- Grammar correction functionality
- Style improvement capabilities
- Clarity enhancement features
- Tone adjustment tools
- Custom correction prompts
- OpenAI-compatible API integration
- JSON schema validation for API responses
- Detailed correction explanations with change tracking
- Context menu integration for easy access
- Command palette support
- Status bar indicators
- Progress notifications during corrections
- Comprehensive error handling
- Configuration management with validation
- Undo support for corrections
- Webview-based detailed explanation viewer

### Features
- **Core Correction Types**:
  - Grammar: Fix grammatical errors, verb tenses, punctuation
  - Style: Improve word choice, flow, and readability
  - Clarity: Simplify complex sentences, remove ambiguity
  - Tone: Ensure appropriate and consistent tone
  - Custom: User-defined correction instructions

- **User Interface**:
  - Right-click context menu integration
  - Command palette commands
  - Status bar indicator with extension status
  - Progress notifications during API calls
  - Detailed explanation viewer with change highlighting

- **API Integration**:
  - OpenAI-compatible API support
  - Configurable endpoints and models
  - Request/response validation
  - Error handling for network issues
  - Connection testing functionality

- **Configuration**:
  - API endpoint configuration
  - API key management
  - Model selection
  - Token limits and temperature settings
  - Custom prompt management

### Technical Implementation
- TypeScript-based VSCode extension
- Webpack build system
- Jest testing framework
- ESLint code quality
- Modular architecture with separation of concerns
- Comprehensive error handling and logging
- JSON schema validation using AJV
- Node-fetch for HTTP requests

### Requirements
- VSCode 1.74.0 or higher
- OpenAI-compatible API access
- Internet connection for API calls

### Known Issues
- None at initial release

### Future Enhancements
- Batch processing for multiple files
- Offline correction capabilities
- Additional language support
- Integration with more LLM providers
- Custom prompt templates
- Correction history and analytics