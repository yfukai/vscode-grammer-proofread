# Design Document

## Overview

The Grammar Proofreading Extension is a VSCode extension that provides AI-powered text correction through user-configurable custom prompts. The system enables users to create, manage, and apply personalized correction prompts with full CRUD operations, while maintaining a configurable shared prompt that applies to all corrections. The extension features a chat widget interface for interactive prompt execution and ensures single-task concurrency for predictable behavior.

## Architecture

The extension follows a layered architecture with clear separation of concerns:

### Core Layers

1. **UI Layer**: VSCode integration, chat widget, context menus, and command palette
2. **Service Layer**: Business logic for prompt management, correction orchestration, and API communication
3. **Storage Layer**: VSCode settings and workspace state management
4. **API Layer**: LLM service integration with request/response handling

### Key Architectural Principles

- **Single Responsibility**: Each component handles one specific concern
- **Dependency Injection**: Services are injected to enable testing and flexibility
- **Event-Driven**: UI components react to state changes through events
- **Immutable State**: Configuration and prompt data are treated as immutable
- **Error Boundaries**: Each layer handles its own errors and provides meaningful feedback

## Components and Interfaces

### Prompt Management System

```typescript
interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptConfiguration {
  customPrompts: CustomPrompt[];
  sharedPrompt: string;
}

class PromptManager {
  createPrompt(name: string, content: string): CustomPrompt
  updatePrompt(id: string, name: string, content: string): CustomPrompt
  deletePrompt(id: string): void
  getPrompts(): CustomPrompt[]
  getSharedPrompt(): string
  setSharedPrompt(content: string): void
  validateSharedPrompt(content: string): boolean
}

interface PromptSettingsUI {
  showCustomPrompts(): void
  showSharedPromptEditor(): void
  onSharedPromptChange(callback: (newContent: string) => void): void
}
```

### Task Management System

```typescript
interface TaskManager {
  canStartTask(selection: TextSelection): boolean
  startTask(selection: TextSelection): string // returns task ID
  completeTask(taskId: string): void
  getConflictingTasks(selection: TextSelection): ActiveTask[]
  isSelectionOverlapping(sel1: TextSelection, sel2: TextSelection): boolean
}

class SelectionTracker {
  private activeTasks: Map<string, ActiveTask> = new Map()
  
  isOverlapping(selection1: TextSelection, selection2: TextSelection): boolean {
    // Different documents never overlap
    if (selection1.documentUri !== selection2.documentUri) return false
    
    // Check line and character overlap
    return !(selection1.endLine < selection2.startLine || 
             selection2.endLine < selection1.startLine ||
             (selection1.endLine === selection2.startLine && selection1.endCharacter <= selection2.startCharacter) ||
             (selection2.endLine === selection1.startLine && selection2.endCharacter <= selection1.startCharacter))
  }
}
```

### Chat Widget System

```typescript
interface ChatMessage {
  id: string;
  type: 'request' | 'response' | 'error';
  content: string;
  promptName: string;
  timestamp: Date;
}

class ChatWidget {
  showPromptButtons(prompts: CustomPrompt[]): void
  addMessage(message: ChatMessage): void
  clearHistory(): void
  setTaskRunning(isRunning: boolean): void
}
```

### Correction Service

```typescript
interface TextSelection {
  documentUri: string;
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

interface CorrectionRequest {
  promptId: string;
  text: string;
  selection: TextSelection;
  isFullDocument: boolean;
}

interface CorrectionResponse {
  correctedText: string;
  explanation?: string;
}

interface ActiveTask {
  id: string;
  selection: TextSelection;
  startTime: Date;
}

class CorrectionService {
  executeCorrection(request: CorrectionRequest): Promise<CorrectionResponse>
  isSelectionBlocked(selection: TextSelection): boolean
  getActiveTasks(): ActiveTask[]
  cancelTask(taskId: string): void
}
```

### API Integration

```typescript
interface LLMApiConfiguration {
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

class LLMApiClient {
  sendRequest(prompt: string, text: string): Promise<string>
  validateConfiguration(): boolean
}
```

## Data Models

### Custom Prompt Model

- **ID**: Unique identifier (UUID)
- **Name**: User-friendly display name (1-100 characters, unique)
- **Content**: Prompt text (1-2000 characters)
- **Timestamps**: Creation and modification dates
- **Validation**: Name uniqueness, content length limits

### Configuration Model

- **Custom Prompts**: Array of CustomPrompt objects
- **Shared Prompt**: Global prompt text (0-2000 characters, user-configurable through settings UI)
- **API Settings**: LLM service configuration
- **UI Preferences**: Chat widget visibility, button layout, prompt settings panel
- **Active Tasks**: Map of task IDs to TextSelection objects for concurrency control

### Chat History Model

- **Messages**: Ordered list of ChatMessage objects
- **Session Management**: Persistence across VSCode sessions
- **Size Limits**: Maximum 100 messages, auto-cleanup of oldest

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
### Property Reflection

After reviewing all properties identified in the prework, I've identified several areas of redundancy:

- Properties 2.2 and 3.1 both test prompt combination logic - these can be combined
- Properties 1.4 and 7.3 both test UI refresh after prompt updates - these can be combined  
- Properties 6.1, 6.2, and 10.1 all test UI state management during tasks - these can be streamlined
- Properties 7.1, 7.2, and 9.1 all test prompt display in different interfaces - these can be consolidated

The following properties provide unique validation value and will be implemented:

**Property 1: Prompt CRUD operations maintain data integrity**
*For any* sequence of create, update, and delete operations on custom prompts, the system should maintain data consistency with unique IDs, unique names, and proper storage synchronization
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

**Property 2: Prompt combination consistency**
*For any* custom prompt and shared prompt combination, the final prompt sent to the LLM should always be the custom prompt content followed by the shared prompt content
**Validates: Requirements 2.2, 3.1**

**Property 3: Minimum prompt invariant**
*For any* state of the system, there should always be at least one custom prompt available, and deletion operations should be prevented when only one prompt remains
**Validates: Requirements 4.2**

**Property 4: Text replacement accuracy**
*For any* selected text and LLM response, the corrected text should replace exactly the selected portion without affecting surrounding content
**Validates: Requirements 3.3**

**Property 5: API configuration validation**
*For any* API configuration input, invalid URLs, missing credentials, or malformed settings should be rejected with appropriate error messages
**Validates: Requirements 5.1, 5.3**

**Property 6: Selection-based concurrency control**
*For any* text selection in any document, only one correction task should be allowed on that specific selection, while non-overlapping selections in the same document or selections in different documents should be allowed to run concurrently
**Validates: Requirements 10.1, 10.2, 10.3**

**Property 7: UI synchronization consistency**
*For any* change to custom prompts, all user interfaces (context menus, command palette, chat widget) should reflect the updated prompt list immediately
**Validates: Requirements 7.3, 9.4**

**Property 8: Full document processing preservation**
*For any* document content, when applying corrections to the entire document, the operation should preserve the document structure while updating the text content
**Validates: Requirements 8.1, 8.2, 8.5**

**Property 9: Chat history management**
*For any* sequence of correction requests and responses, the chat widget should maintain chronological order with proper timestamps and message formatting
**Validates: Requirements 9.2, 9.3, 9.5**

**Property 10: Configuration persistence**
*For any* changes to shared prompts or API settings, the configuration should be stored immediately and applied to all subsequent operations
**Validates: Requirements 2.1, 2.4, 5.5**

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid prompt names, empty content, malformed API configurations
2. **API Errors**: Network failures, authentication issues, rate limiting, service unavailable
3. **System Errors**: Storage failures, extension crashes, VSCode API issues
4. **User Errors**: No text selected, concurrent task attempts, invalid operations

### Error Handling Strategy

- **Graceful Degradation**: System continues operating with reduced functionality when possible
- **User Feedback**: Clear, actionable error messages with suggested solutions
- **State Recovery**: Automatic recovery from transient errors, manual recovery options for persistent issues
- **Logging**: Comprehensive error logging for debugging and support

### Specific Error Scenarios

- **API Timeout**: Display timeout message, allow retry, preserve original text
- **Invalid Prompt**: Prevent save operation, highlight validation errors, suggest corrections
- **Storage Failure**: Use in-memory fallback, warn user about persistence issues
- **Concurrent Task**: Block new requests, display clear status message, provide cancel option

## Testing Strategy

### Dual Testing Approach

The extension will use both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and integration points between components
- **Property Tests**: Verify universal properties that should hold across all inputs using fast-check library
- **Integration Tests**: Test complete workflows and VSCode API integration

### Property-Based Testing Requirements

- **Library**: fast-check for TypeScript property-based testing
- **Iterations**: Minimum 100 iterations per property test to ensure thorough coverage
- **Tagging**: Each property test tagged with format: `**Feature: grammar-proofreading-extension, Property {number}: {property_text}**`
- **Coverage**: Each correctness property implemented by exactly one property-based test

### Unit Testing Focus Areas

- Component initialization and configuration
- API request/response handling
- UI event handling and state management
- Error boundary testing
- VSCode extension lifecycle events

### Test Organization

- Service layer tests in `src/services/__tests__/`
- UI component tests in `src/ui/__tests__/`
- Integration tests in `src/test/`
- Property-based tests co-located with unit tests
- Mock configurations for API testing

### Testing Tools

- **Jest**: Primary testing framework with ts-jest preset
- **fast-check**: Property-based testing library
- **VSCode Test Runner**: Integration testing with VSCode APIs
- **Mock Services**: Isolated testing of individual components