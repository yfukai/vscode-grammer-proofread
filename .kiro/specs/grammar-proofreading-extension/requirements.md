# Requirements Document

## Introduction

A VSCode extension that provides AI-powered text correction capabilities using user-configurable custom prompts. Users can create, manage, and apply personalized correction prompts (such as grammar correction, logic reorganization, tense changes) through a flexible prompt management system with CRUD operations.

## Glossary

- **Extension**: The VSCode grammar proofreading extension
- **Custom Prompt**: A user-defined name-prompt pair for specific text correction tasks
- **Shared Prompt**: A global prompt text that is automatically appended to all custom prompts
- **CRUD Operations**: Create, Read, Update, Delete operations for managing custom prompts
- **LLM API**: Large Language Model API service (OpenAI-compatible)
- **Text Selection**: The currently selected text in the VSCode editor
- **Correction Request**: An API request combining custom prompt, shared prompt, and selected text

## Requirements

### Requirement 1

**User Story:** As a user, I want to create and manage custom prompts, so that I can define specific text correction tasks tailored to my needs.

#### Acceptance Criteria

1. WHEN a user accesses the prompt management interface THEN the Extension SHALL display all existing custom prompts with their names and content
2. WHEN a user creates a new custom prompt THEN the Extension SHALL validate the prompt name is unique and non-empty
3. WHEN a user updates an existing custom prompt THEN the Extension SHALL preserve the prompt's unique identifier while updating the name and content
4. WHEN a user deletes a custom prompt THEN the Extension SHALL remove it from storage and update the interface immediately
5. WHERE at least one custom prompt exists, the Extension SHALL ensure prompt management operations remain available

### Requirement 2

**User Story:** As a user, I want to configure a shared prompt that applies to all corrections, so that I can establish consistent context or instructions across all my custom prompts.

#### Acceptance Criteria

1. WHEN a user configures the shared prompt THEN the Extension SHALL store it in the extension settings
2. WHEN a correction request is made THEN the Extension SHALL append the shared prompt to the selected custom prompt
3. WHEN the shared prompt is empty THEN the Extension SHALL use only the custom prompt without additional text
4. WHEN the shared prompt is updated THEN the Extension SHALL apply the changes to all subsequent correction requests
5. THE Extension SHALL provide a dedicated settings interface for editing the shared prompt with validation and preview capabilities

### Requirement 3

**User Story:** As a user, I want to apply custom prompts to selected text in the editor, so that I can perform specific text corrections using my configured prompts.

#### Acceptance Criteria

1. WHEN a user selects text and chooses a custom prompt THEN the Extension SHALL combine the custom prompt with the shared prompt
2. WHEN a correction request is sent THEN the Extension SHALL include the selected text, combined prompt, and API configuration
3. WHEN the LLM API responds THEN the Extension SHALL replace the selected text with the corrected version
4. WHEN no text is selected THEN the Extension SHALL prevent prompt execution and display an appropriate message
5. WHEN an API error occurs THEN the Extension SHALL display the error message and maintain the original text

### Requirement 4

**User Story:** As a user, I want the extension to ensure at least one custom prompt exists, so that I can always perform text corrections without additional setup.

#### Acceptance Criteria

1. WHEN the extension is first installed THEN the Extension SHALL create default custom prompts for common correction types
2. WHEN all custom prompts are deleted THEN the Extension SHALL prevent the deletion and maintain at least one prompt
3. WHEN the extension starts THEN the Extension SHALL verify at least one custom prompt exists in storage
4. THE Extension SHALL provide default prompts for grammar correction, logic reorganization, and tense changes
5. WHEN default prompts are created THEN the Extension SHALL use descriptive names and effective prompt content

### Requirement 5

**User Story:** As a user, I want to configure API settings for LLM integration, so that I can connect to my preferred AI service for text corrections.

#### Acceptance Criteria

1. WHEN a user configures API settings THEN the Extension SHALL validate the API endpoint URL format
2. WHEN API credentials are provided THEN the Extension SHALL store them securely in VSCode settings
3. WHEN API configuration is invalid THEN the Extension SHALL display clear error messages and prevent requests
4. THE Extension SHALL support OpenAI-compatible API endpoints including OpenAI, Azure OpenAI, and local servers
5. WHEN API settings are updated THEN the Extension SHALL apply changes to subsequent correction requests

### Requirement 6

**User Story:** As a user, I want visual feedback during correction operations, so that I understand the current status and can track progress.

#### Acceptance Criteria

1. WHEN a correction request starts THEN the Extension SHALL display a progress indicator
2. WHEN a correction request completes successfully THEN the Extension SHALL hide the progress indicator and show success feedback
3. WHEN a correction request fails THEN the Extension SHALL display an error notification with details
4. WHEN multiple requests are in progress THEN the Extension SHALL handle them independently without interference
5. THE Extension SHALL provide clear status messages throughout the correction process

### Requirement 7

**User Story:** As a user, I want to access custom prompts through VSCode's interface, so that I can easily apply corrections without leaving my editing workflow.

#### Acceptance Criteria

1. WHEN a user right-clicks on selected text THEN the Extension SHALL display custom prompts in the context menu
2. WHEN a user opens the command palette THEN the Extension SHALL list all available custom prompts as commands
3. WHEN custom prompts are updated THEN the Extension SHALL refresh the available commands immediately
4. THE Extension SHALL organize prompts in a logical order in menus and command palette
5. WHEN a prompt is selected from any interface THEN the Extension SHALL execute the correction using that prompt

### Requirement 8

**User Story:** As a user, I want to apply corrections to entire documents when no text is selected, so that I can process complete files efficiently.

#### Acceptance Criteria

1. WHEN a user chooses a custom prompt without selecting text THEN the Extension SHALL apply the correction to all text in the active editor
2. WHEN processing entire document content THEN the Extension SHALL preserve the document's original formatting and structure
3. WHEN the document is empty THEN the Extension SHALL display an appropriate message and take no action
4. WHEN the document is very large THEN the Extension SHALL warn the user before processing and allow cancellation
5. THE Extension SHALL replace the entire document content with the corrected version upon successful completion

### Requirement 9

**User Story:** As a user, I want a chat widget interface for interacting with custom prompts, so that I can see LLM responses and manage correction tasks in a dedicated panel.

#### Acceptance Criteria

1. WHEN the chat widget is opened THEN the Extension SHALL display buttons corresponding to each custom prompt
2. WHEN a user clicks a prompt button THEN the Extension SHALL submit the correction task and display the request in the chat
3. WHEN the LLM responds THEN the Extension SHALL display the response in the chat widget with clear formatting
4. WHEN custom prompts are updated THEN the Extension SHALL refresh the prompt buttons in the chat widget immediately
5. THE Extension SHALL maintain a conversation history showing requests and responses with timestamps

### Requirement 10

**User Story:** As a user, I want the extension to prevent conflicting tasks on the same text selection, so that I can avoid conflicts while allowing parallel work on different parts of documents.

#### Acceptance Criteria

1. WHEN a correction task is running on a text selection THEN the Extension SHALL prevent new tasks on overlapping selections in the same document
2. WHEN a user attempts to start a task on an overlapping selection THEN the Extension SHALL display a message indicating the selection is currently being processed
3. WHEN tasks are running on non-overlapping selections THEN the Extension SHALL allow them to proceed independently
4. WHEN tasks are running on different documents THEN the Extension SHALL allow them to proceed without restriction
5. WHEN a task completes or fails THEN the Extension SHALL immediately allow new tasks on that selection

### Requirement 11

**User Story:** As a user, I want a dedicated settings interface for managing prompts, so that I can easily configure both custom prompts and the shared prompt in one place.

#### Acceptance Criteria

1. WHEN a user opens the prompt settings THEN the Extension SHALL display both custom prompt management and shared prompt configuration
2. WHEN a user edits the shared prompt THEN the Extension SHALL provide real-time validation and character count feedback
3. WHEN the shared prompt exceeds length limits THEN the Extension SHALL prevent saving and display validation errors
4. THE Extension SHALL provide a preview feature showing how the shared prompt combines with custom prompts
5. WHEN prompt settings are saved THEN the Extension SHALL immediately apply changes to all active interfaces

**User Story:** As a user, I want the extension to prevent conflicting tasks on the same text selection, so that I can avoid conflicts while allowing parallel work on different parts of documents.

#### Acceptance Criteria

1. WHEN a correction task is running on a text selection THEN the Extension SHALL prevent new tasks on overlapping selections in the same document
2. WHEN a user attempts to start a task on an overlapping selection THEN the Extension SHALL display a message indicating the selection is currently being processed
3. WHEN tasks are running on non-overlapping selections THEN the Extension SHALL allow them to proceed independently
4. WHEN tasks are running on different documents THEN the Extension SHALL allow them to proceed without restriction
5. WHEN a task completes or fails THEN the Extension SHALL immediately allow new tasks on that selection