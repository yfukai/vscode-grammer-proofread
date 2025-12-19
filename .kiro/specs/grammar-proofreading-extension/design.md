# Design Document

## Overview

The Grammar Proofreading Extension is a VSCode extension that integrates Large Language Model capabilities directly into the editor workflow through a chat-style interface. The extension provides a conversational interface for grammar correction and proofreading through user-configurable name-prompt pairs, leveraging OpenAI-compatible APIs to deliver intelligent text improvements with explanatory feedback displayed in a chat widget.

The extension follows VSCode's extension architecture patterns, utilizing the Extension API for UI integration, workspace management, and configuration handling. The design emphasizes user experience through a chat-style interface, support for text selection processing, and robust error handling with conversational feedback.

## Architecture

The extension follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│           VSCode Extension          │
├─────────────────────────────────────┤
│  UI Layer (Chat Widget & Buttons)   │
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
- **ChatWidget**: Main chat-style interface panel for displaying correction buttons and LLM responses
- **CorrectionButtonProvider**: Creates and manages correction buttons within the chat widget
- **MessageRenderer**: Handles rendering of chat messages, user requests, and LLM responses
- **ConversationManager**: Manages chat history and message threading
- **NotificationManager**: Handles user notifications and explanations
- **ProgressIndicator**: Shows correction progress during API calls

### Core Services
- **CorrectionService**: Orchestrates the correction workflow
- **TextProcessor**: Handles text extraction (full document or selection) and replacement in editors
- **SelectionManager**: Manages text selection detection and processing
- **ValidationService**: Validates API responses against JSON schema

### API Integration
- **LLMApiClient**: Handles communication with OpenAI-compatible APIs
- **RequestBuilder**: Constructs API requests with prompts and text
- **ResponseParser**: Parses and validates API responses

### Configuration Management
- **ConfigurationProvider**: Manages extension settings and API configuration
- **PromptManager**: Handles user-configurable name-prompt pairs with CRUD operations
- **SettingsProvider**: Manages VSCode settings integration for custom prompt configuration

## Data Models

### CorrectionRequest
```typescript
interface CorrectionRequest {
  text: string;
  prompt: string;
  promptName: string;
  isSelection: boolean;
  selectionRange?: {
    start: number;
    end: number;
  };
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

### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  promptName?: string;
  isSelection?: boolean;
  selectionRange?: {
    start: number;
    end: number;
  };
  actions?: MessageAction[];
}
```

### MessageAction
```typescript
interface MessageAction {
  id: string;
  label: string;
  type: 'apply' | 'dismiss' | 'copy';
  data?: any;
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
  customPrompts: NamePromptPair[];
}
```

### NamePromptPair
```typescript
interface NamePromptPair {
  id: string;
  name: string;
  prompt: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ConversationHistory
```typescript
interface ConversationHistory {
  messages: ChatMessage[];
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Button click captures correct text based on selection state
*For any* correction button click with an active editor, the extension should capture the selected text if a selection exists, otherwise capture the entire document text
**Validates: Requirements 1.2, 5.1, 5.2**

Property 2: Text capture triggers API request with correct prompt
*For any* captured text and prompt name, the extension should send the text with the associated prompt to the configured LLM API
**Validates: Requirements 1.3**

Property 3: API response validation occurs
*For any* LLM API response, the extension should validate the response structure against the predefined JSON schema
**Validates: Requirements 1.4, 4.1**

Property 4: Valid responses display in chat widget with actions
*For any* successfully validated API response, the extension should display the response as a message in the chat widget with action buttons to apply or dismiss corrections
**Validates: Requirements 1.5, 1.6, 3.2, 7.3**

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

Property 9: Multiple corrections provide individual explanations
*For any* correction response with multiple changes, the extension should provide explanations for each significant change in the chat widget message
**Validates: Requirements 3.3**

Property 10: Validation failures are logged and reported
*For any* response validation failure, the extension should log the error and display a user-friendly message
**Validates: Requirements 4.2**

Property 11: Valid responses proceed to processing
*For any* response containing required fields (corrected text and explanation), the extension should proceed with displaying the correction in the chat widget
**Validates: Requirements 4.3**

Property 12: Missing fields cause response rejection
*For any* response missing required fields, the extension should reject the response and maintain the original text
**Validates: Requirements 4.4**

Property 13: Malformed JSON is handled gracefully
*For any* malformed JSON response, the extension should handle the parsing error gracefully without crashing
**Validates: Requirements 4.5**

Property 14: Selection processing sends only selected text
*For any* text selection and correction request, the extension should send only the selected portion to the LLM API
**Validates: Requirements 5.3**

Property 15: Selection corrections replace only selected portion
*For any* correction applied to selected text, the extension should replace only the selected portion in the editor
**Validates: Requirements 5.4**

Property 16: Selection corrections indicate processed portion
*For any* selected text correction displayed in the chat widget, the message should clearly indicate which portion of text was processed
**Validates: Requirements 5.5**

Property 17: Name-prompt pair creation adds button
*For any* new name-prompt pair created in settings, the extension should add a corresponding correction button to the chat widget
**Validates: Requirements 6.2**

Property 18: Name-prompt pair modification updates button
*For any* existing name-prompt pair modification, the extension should update the button label and associated prompt
**Validates: Requirements 6.3**

Property 19: Name-prompt pair deletion removes button
*For any* name-prompt pair deletion, the extension should remove the corresponding correction button from the chat widget
**Validates: Requirements 6.4**

Property 20: Name-prompt configuration round-trip
*For any* set of name-prompt pairs configured in settings, saving and reloading the chat widget should display correction buttons for all configured pairs
**Validates: Requirements 6.5, 6.6**

Property 21: Invalid prompt content is validated
*For any* invalid prompt content provided in settings, the extension should validate the input and display appropriate error messages
**Validates: Requirements 6.7**

Property 22: Duplicate names are prevented
*For any* attempt to create a name-prompt pair with a duplicate name, the extension should prevent creation and display a conflict error message
**Validates: Requirements 6.8**

Property 23: Correction requests display in chat
*For any* correction request made, the extension should display the user's request context in the chat widget
**Validates: Requirements 7.2**

Property 24: Conversation history is maintained
*For any* sequence of multiple correction requests, the extension should maintain a conversation history in the chat widget
**Validates: Requirements 7.4**

Property 25: Messages are visually distinguished
*For any* message displayed in the chat widget, the extension should clearly distinguish between user requests and LLM responses
**Validates: Requirements 7.6**

Property 26: Session history persists across widget lifecycle
*For any* conversation history in the current session, closing and reopening the chat widget should preserve the conversation history
**Validates: Requirements 7.7**

## VSCode Settings Integration

The extension integrates with VSCode's native settings system to provide configurable name-prompt pairs:

**Settings Schema Definition:**
- Extension contributes settings through `package.json` configuration
- Custom name-prompt pairs stored as an array of objects in settings
- Each pair includes name, prompt, description, and metadata fields
- Validation rules ensure unique names and non-empty prompt content

**Settings UI Features:**
- Native VSCode settings interface for managing name-prompt pairs
- Array-based settings UI for adding, editing, and removing pairs
- Clear descriptions and validation for each field
- Real-time validation with error messaging for invalid inputs
- Duplicate name detection and prevention

**Configuration Persistence:**
- Name-prompt pairs stored in VSCode's configuration system
- Changes automatically persisted across sessions
- Workspace-specific overrides supported for team configurations
- Migration support for upgrading from fixed prompt categories

**Chat Widget Integration:**
- Dynamic button generation based on configured name-prompt pairs
- Real-time updates when settings change
- Fallback to default prompts when no custom pairs are configured
- Button labels match the configured names exactly

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
1. **Text Processing Properties**: Verify text capture (full document vs selection), replacement, and preservation behaviors
2. **API Integration Properties**: Validate request construction and response handling
3. **Configuration Properties**: Test settings validation and connection management
4. **Name-Prompt Configuration Properties**: Verify custom name-prompt pair CRUD operations and persistence
5. **Chat Widget Properties**: Verify message display, conversation history, and UI state management
6. **Selection Handling Properties**: Verify correct processing of selected vs full document text
7. **Error Handling Properties**: Ensure consistent error behavior across failure scenarios
8. **UI Interaction Properties**: Verify button behavior, action buttons, and user feedback mechanisms

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