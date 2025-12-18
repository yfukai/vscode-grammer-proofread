# Technology Stack

## Core Technologies

- **TypeScript**: Primary language (ES2020 target)
- **VSCode Extension API**: VSCode 1.74.0+ compatibility
- **Node.js**: Runtime environment (Node 16.x)
- **Webpack**: Module bundler for production builds
- **Jest**: Testing framework with ts-jest preset

## Key Dependencies

### Runtime Dependencies
- `node-fetch`: HTTP client for API requests
- `ajv`: JSON schema validation

### Development Dependencies
- `@typescript-eslint/*`: TypeScript linting
- `ts-loader`: TypeScript compilation for Webpack
- `@vscode/vsce`: Extension packaging and publishing
- `fast-check`: Property-based testing

## Build System

### Common Commands

```bash
# Development
npm run compile          # Compile TypeScript with Webpack
npm run watch           # Watch mode compilation
npm run compile-tests   # Compile tests to out/ directory
npm run watch-tests     # Watch mode for tests

# Testing & Quality
npm run lint            # ESLint TypeScript files
npm test               # Run Jest test suite
npm run pretest        # Full pre-test pipeline (compile + lint)

# Production & Publishing
npm run package        # Production build with source maps
npm run vscode:prepublish  # Pre-publish build step
npm run vsce:package   # Create .vsix package
npm run vsce:publish   # Publish to marketplace
```

### Build Configuration

- **Webpack**: Bundles to `dist/extension.js` with CommonJS2 target
- **TypeScript**: Strict mode enabled, outputs to `out/` for tests
- **ESLint**: TypeScript-specific rules with naming conventions
- **Jest**: Collects coverage from `src/` excluding tests and type definitions

## API Integration

- **OpenAI-compatible APIs**: Supports OpenAI, Azure OpenAI, local LLM servers
- **HTTP Client**: Uses node-fetch for API communication
- **Schema Validation**: AJV for response validation