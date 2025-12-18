# Design Document

## Overview

The Grammar Proofreading Extension is a VSCode extension that integrates Large Language Model capabilities directly into the editor workflow. The extension provides a seamless interface for grammar correction and proofreading through predefined prompts, leveraging OpenAI-compatible APIs to deliver intelligent text improvements with explanatory feedback.

The extension follows VSCode's extension architecture patterns, utilizing the Extension API for UI integration, workspace management, and configuration handling. The design emphasizes user experience through non-intrusive corrections, clear feedback mechanisms, and robust error handling.

## Architecture

The extension follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│           VSCode Extension          │
├─────────────────────────────────────┤
│  UI Layer (Commands & Buttons)      │
├─────────────────────────────────────┤
│  Service Layer (Correction Logic)   │
├─────────────────────────────────────┤
│  API Layer (LLM Communication)      │
├─────────────────────────────────────┤
│  Configuration Layer (Settings)     │
└─────────────────────────────────────┘
```

**Key Architectural Principles:**
- Separation of concerns between UI, business logic, and external API communication
- Dependency injection for testability and modularity
- Event-driven communication between components
- Graceful degradation when API services are unavailable

## Components and Interfaces

### Extension Entry Point
- **ExtensionActivator**: Main extension activation handler
- **CommandRegistry**: Registers VSCode commands for correction buttons
- **StatusBarManager**: Manages extension status indicators

### UI Components
- **CorrectionButtonProvider**: Creates and manages correction buttons in the editor
- **NotificationManager**: Handles user notifications and explanations
- **ProgressIndicator**: Shows correction progress during API calls

### Core Services
- **CorrectionService**: Orchestrates the correction workflow
- **TextProcessor**: Handles text extraction and replacement in editors
- **ValidationService**: Validates API responses against JSON schema

### API Integration
- **LLMApiClient**: Handles communication with OpenAI-compatible APIs
- **RequestBuilder**: Constructs API requests with prompts and text
- **ResponseParser**: Parses and validates API responses

### Configuration Management
- **ConfigurationProvider**: Manages extension settings and API configuration
- **PromptManager**: Handles predefined and custom correction prompts
- **SettingsProvider**: Manages VSCode settings integration for prompt configuration

## Data Models

### CorrectionRequest
```typescript
interface CorrectionRequest {
  text: string;
  prompt: string;
  correctionType: CorrectionType;
  apiEndpoint: string;
  apiKey: string;
}
```

### CorrectionResponse
```typescript
interface CorrectionResponse {
  correctedText: string;
  explanation: string;
  changes: TextChange[];
  confidence: number;
}
```

### TextChange
```typescript
interface TextChange {
  original: string;
  corrected: string;
  reason: string;
  position: {
    start: number;
    end: number;
  };
}
```

### CorrectionType
```typescript
enum CorrectionType {
  GRAMMAR = "grammar",
  STYLE = "style", 
  CLARITY = "clarity",
  TONE = "tone",
  CUSTOM = "custom"
}
```

### ExtensionConfiguration
```typescript
interface ExtensionConfiguration {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  customPrompts: CustomPrompt[];
  defaultPrompts: DefaultPromptConfiguration;
}
```

### DefaultPromptConfiguration
```typescript
interface DefaultPromptConfiguration {
  grammar: string;
  style: string;
  clarity: string;
  tone: string;
}
```

### CustomPrompt
```typescript
interface CustomPrompt {
  name: string;
  prompt: string;
  correctionType: string;
  description?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Button click captures editor text
*For any* correction button click with an active editor, the extension should capture the current document text from that editor
**Validates: Requirements 1.2**

Property 2: Text capture triggers API request
*For any* captured document text and correction type, the extension should send the text with the associated prompt to the configured LLM API
**Validates: Requirements 1.3**

Property 3: API response validation occurs
*For any* LLM API response, the extension should validate the response structure against the predefined JSON schema
**Validates: Requirements 1.4, 4.1**

Property 4: Valid responses trigger text replacement
*For any* successfully validated API response, the extension should replace the original document text with the corrected version
**Validates: Requirements 1.5**

Property 5: Invalid credentials prevent API calls
*For any* invalid API credentials, the extension should display error messages and prevent API calls from being made
**Validates: Requirements 2.2**

Property 6: Configuration updates trigger validation
*For any* API configuration update, the extension should validate the connection before saving the new settings
**Validates: Requirements 2.3**

Property 7: Network errors are handled gracefully
*For any* network failure during API calls, the extension should handle the error gracefully and inform the user
**Validates: Requirements 2.4**

Property 8: Correction responses extract required data
*For any* valid correction response from the LLM API, the extension should extract both corrected text and explanation
**Validates: Requirements 3.1**

Property 9: Text replacement shows explanations
*For any* text replacement operation, the extension should display the correction explanation to the user
**Validates: Requirements 3.2**

Property 10: Multiple corrections provide individual explanations
*For any* correction response with multiple changes, the extension should provide explanations for each significant change
**Validates: Requirements 3.3**

Property 11: Validation failures are logged and reported
*For any* response validation failure, the extension should log the error and display a user-friendly message
**Validates: Requirements 4.2**

Property 12: Valid responses proceed to replacement
*For any* response containing required fields (corrected text and explanation), the extension should proceed with text replacement
**Validates: Requirements 4.3**

Property 13: Missing fields cause response rejection
*For any* response missing required fields, the extension should reject the response and maintain the original text
**Validates: Requirements 4.4**

Property 14: Malformed JSON is handled gracefully
*For any* malformed JSON response, the extension should handle the parsing error gracefully without crashing
**Validates: Requirements 4.5**

Property 15: Correction buttons use associated prompts
*For any* correction button click, the extension should use the predefined prompt associated with that specific correction type
**Validates: Requirements 5.2**

Property 16: API requests combine text and prompts
*For any* API request, the extension should properly combine the document text with the selected correction prompt
**Validates: Requirements 5.3**

Property 17: Correction types have clear labels
*For any* available correction type, the extension should display a clearly labeled button that indicates its purpose
**Validates: Requirements 5.4**

Property 18: Prompt customization is supported
*For any* prompt configuration operation, the extension should allow users to customize existing prompts or add new correction prompts
**Validates: Requirements 5.5**

Property 19: Settings modifications persist correctly
*For any* default prompt modification in VSCode settings, the extension should persist the updated prompt value and retrieve it correctly
**Validates: Requirements 6.2**

Property 20: Configured prompts are used when available
*For any* correction button click with a configured prompt, the extension should use the configured prompt from settings instead of the built-in default
**Validates: Requirements 6.3**

Property 21: Fallback to default prompts works
*For any* correction type without a custom configuration, the extension should use the built-in default prompt for that correction type
**Validates: Requirements 6.4**

Property 22: Prompt reset restores defaults
*For any* prompt configuration reset operation, the extension should restore the original built-in default prompt for that correction type
**Validates: Requirements 6.5**

Property 23: Invalid prompts are validated and rejected
*For any* invalid prompt content provided in settings, the extension should validate the prompt and display appropriate error messages
**Validates: Requirements 6.7**

## VSCode Settings Integration

The extension integrates with VSCode's native settings system to provide configurable default prompts:

**Settings Schema Definition:**
- Extension contributes settings through `package.json` configuration
- Each default prompt type (grammar, style, clarity, tone) has a dedicated setting
- Settings include descriptions and default values for user guidance
- Validation rules ensure prompt content meets minimum requirements

**Settings UI Features:**
- Native VSCode settings interface for prompt configuration
- Clear descriptions explaining each correction type's purpose
- Default value restoration through settings reset functionality
- Real-time validation with error messaging for invalid inputs

**Configuration Persistence:**
- Settings are stored in VSCode's configuration system
- Changes are automatically persisted across sessions
- Workspace-specific overrides supported for team configurations
- Migration support for existing custom prompt configurations

## Error Handling

The extension implements comprehensive error handling across all layers:

**API Communication Errors:**
- Network timeouts and connection failures
- Invalid API responses and malformed JSON
- Authentication and authorization errors
- Rate limiting and quota exceeded scenarios

**Validation Errors:**
- JSON schema validation failures
- Missing required response fields
- Invalid configuration parameters
- Malformed prompt templates

**Editor Integration Errors:**
- No active editor available
- Read-only documents
- Large document handling
- Concurrent modification conflicts

**User Experience Errors:**
- Clear error messages without technical jargon
- Graceful degradation when services are unavailable
- Retry mechanisms for transient failures
- Fallback behaviors for critical operations

## Testing Strategy

### Unit Testing Approach
The extension uses Jest for unit testing with the following focus areas:
- Configuration validation and management
- JSON schema validation logic
- Text processing and replacement functions
- API request construction and response parsing
- Error handling and edge cases

### Property-Based Testing Approach
The extension uses fast-check for property-based testing to verify correctness properties:
- **Minimum iterations**: 100 test cases per property
- **Test tagging**: Each property test includes a comment with the format '**Feature: grammar-proofreading-extension, Property {number}: {property_text}**'
- **Coverage focus**: Universal behaviors that should hold across all valid inputs
- **Generator strategy**: Smart generators that create realistic text content, API responses, and configuration scenarios

**Property Test Categories:**
1. **Text Processing Properties**: Verify text capture, replacement, and preservation behaviors
2. **API Integration Properties**: Validate request construction and response handling
3. **Configuration Properties**: Test settings validation and connection management
4. **Prompt Configuration Properties**: Verify default prompt customization and persistence
5. **Error Handling Properties**: Ensure consistent error behavior across failure scenarios
6. **UI Interaction Properties**: Verify button behavior and user feedback mechanisms

### Integration Testing
- VSCode extension host testing for UI integration
- Mock API server testing for end-to-end workflows
- Configuration persistence testing
- Multi-editor scenario testing

### Testing Framework Requirements
- **Unit Testing**: Jest with VSCode extension testing utilities
- **Property-Based Testing**: fast-check library for TypeScript
- **Mocking**: Sinon.js for API and VSCode API mocking
- **Coverage**: Istanbul for code coverage reporting
- **CI Integration**: GitHub Actions for automated testing

The dual testing approach ensures both specific functionality works correctly (unit tests) and universal properties hold across all scenarios (property tests), providing comprehensive validation of the extension's correctness.