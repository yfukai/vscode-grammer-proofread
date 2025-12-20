# Grammar Proofreading Extension

A VSCode extension that provides AI-powered text correction capabilities using user-configurable custom prompts.

## Features

- Create, manage, and apply personalized correction prompts
- CRUD operations for custom prompts with data integrity guarantees
- Configurable shared prompt that applies to all corrections
- Chat widget interface for interactive prompt execution
- Selection-based concurrency control
- Integration with OpenAI-compatible APIs

## Development

### Prerequisites

- Node.js 16.x or higher
- VSCode 1.74.0 or higher

### Setup

```bash
npm install
npm run compile
npm test
```

### Testing

The project uses Jest for unit testing and fast-check for property-based testing:

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

### Building

```bash
npm run compile         # Compile TypeScript
npm run watch          # Watch for changes
```

## Architecture

The extension follows a layered architecture with clear separation of concerns:

- **UI Layer**: VSCode integration, chat widget, context menus
- **Service Layer**: Business logic for prompt management and correction orchestration
- **Storage Layer**: VSCode settings and workspace state management
- **API Layer**: LLM service integration

## License

MIT