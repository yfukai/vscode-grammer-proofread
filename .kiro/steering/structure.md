# Project Structure

## Architecture Overview

The extension follows a layered architecture with clear separation of concerns:

- **Models**: Type definitions and interfaces
- **Services**: Business logic and external integrations
- **UI**: VSCode integration and user interface components
- **Schemas**: JSON schema definitions for validation

## Folder Structure

```
src/
├── extension.ts              # Main entry point
├── models/                   # Type definitions and interfaces
│   ├── CorrectionRequest.ts
│   ├── CorrectionResponse.ts
│   ├── CorrectionType.ts     # Enum for correction types
│   ├── ExtensionConfiguration.ts
│   ├── TextChange.ts
│   └── index.ts             # Barrel exports
├── services/                # Business logic layer
│   ├── ConfigurationProvider.ts  # VSCode settings management
│   ├── CorrectionService.ts      # Main correction orchestration
│   ├── LLMApiClient.ts          # API communication
│   ├── PromptManager.ts         # Prompt templates
│   ├── RequestBuilder.ts        # API request construction
│   ├── ResponseParser.ts        # API response parsing
│   ├── TextProcessor.ts         # Text manipulation utilities
│   ├── ValidationService.ts     # Input/output validation
│   ├── __tests__/              # Service unit tests
│   └── index.ts                # Barrel exports
├── ui/                      # VSCode integration layer
│   ├── ExtensionActivator.ts    # Main activation logic
│   ├── CommandRegistry.ts       # Command registration
│   ├── CorrectionButtonProvider.ts  # UI button provider
│   ├── NotificationManager.ts    # User notifications
│   ├── ProgressIndicator.ts      # Progress feedback
│   ├── StatusBarManager.ts       # Status bar integration
│   └── index.ts                 # Barrel exports
├── schemas/                 # JSON schema definitions
│   └── correctionResponseSchema.ts
└── test/                   # Integration tests
    ├── extension.test.ts
    └── setup.ts
```

## Naming Conventions

- **Classes**: PascalCase (e.g., `ConfigurationProvider`)
- **Interfaces**: PascalCase (e.g., `ExtensionConfiguration`)
- **Enums**: PascalCase with UPPER_CASE values (e.g., `CorrectionType.GRAMMAR`)
- **Files**: PascalCase matching class/interface names
- **Directories**: camelCase (e.g., `__tests__`)

## Import/Export Patterns

- Each directory has an `index.ts` file for barrel exports
- Use relative imports within the same layer
- Import from barrel exports when crossing layers
- External dependencies imported at the top of files

## Testing Structure

- Unit tests in `__tests__/` subdirectories alongside source files
- Integration tests in `src/test/`
- Test files follow `*.test.ts` naming convention
- Setup files for test configuration