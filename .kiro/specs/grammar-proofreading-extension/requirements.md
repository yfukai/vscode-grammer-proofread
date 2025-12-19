# Requirements Document

## Introduction

A VSCode extension that provides grammar correction and proofreading capabilities using Large Language Models (LLM). The extension integrates with OpenAI-compatible APIs to analyze and improve text quality through predefined prompts, returning structured corrections with explanations.

## Glossary

- **Grammar_Extension**: The VSCode extension that provides grammar correction and proofreading functionality
- **LLM_API**: OpenAI-compatible API service that processes text correction requests
- **Correction_Button**: UI button element within a chat-style widget that triggers specific grammar correction prompts
- **Chat_Widget**: VSCode panel that displays correction buttons and shows LLM responses in a conversational interface
- **Selected_Text**: User-highlighted portion of Document_Text that will be processed instead of the entire document
- **Document_Text**: The active text content in the VSCode editor
- **Correction_Response**: Structured JSON response containing corrected text and explanation
- **JSON_Schema**: Validation schema that defines the expected format of API responses
- **Configuration_Settings**: User-configurable API endpoint and authentication settings
- **Custom_Prompt**: User-defined name-prompt pairs that can be created, modified, and deleted through settings
- **Prompt_Configuration**: VSCode settings interface that allows users to manage custom name-prompt pairs
- **Settings_UI**: VSCode's native settings interface where extension configuration options are displayed

## Requirements

### Requirement 1

**User Story:** As a writer, I want to access grammar correction tools through a chat-style widget in VSCode, so that I can quickly improve my text quality and see LLM responses in a conversational interface.

#### Acceptance Criteria

1. WHEN the Grammar_Extension is activated, THE Grammar_Extension SHALL display a Chat_Widget with correction buttons
2. WHEN a user clicks a Correction_Button, THE Grammar_Extension SHALL capture the current Document_Text or Selected_Text from the active editor
3. WHEN text is captured, THE Grammar_Extension SHALL send the text and associated prompt to the configured LLM_API
4. WHEN the LLM_API returns a response, THE Grammar_Extension SHALL validate the response against the JSON_Schema
5. WHEN validation succeeds, THE Grammar_Extension SHALL display the LLM response as a message in the Chat_Widget
6. WHEN the user reviews the response in the Chat_Widget, THE Grammar_Extension SHALL provide options to apply or dismiss the suggested corrections

### Requirement 2

**User Story:** As a user, I want to configure the LLM API settings, so that I can connect to my preferred OpenAI-compatible service.

#### Acceptance Criteria

1. WHEN a user accesses extension settings, THE Grammar_Extension SHALL provide configuration options for API endpoint and authentication
2. WHEN invalid API credentials are provided, THE Grammar_Extension SHALL display clear error messages and prevent API calls
3. WHEN API configuration is updated, THE Grammar_Extension SHALL validate the connection before saving settings
4. WHEN API calls fail due to network issues, THE Grammar_Extension SHALL handle errors gracefully and inform the user

### Requirement 3

**User Story:** As a content creator, I want to see explanations for grammar corrections in the chat widget, so that I can learn from the changes and improve my writing skills.

#### Acceptance Criteria

1. WHEN the LLM_API returns a Correction_Response, THE Grammar_Extension SHALL extract both corrected text and explanation
2. WHEN a response is received, THE Grammar_Extension SHALL display the explanation and corrected text as a message in the Chat_Widget
3. WHEN multiple corrections are made, THE Grammar_Extension SHALL provide explanations for each significant change in the Chat_Widget message
4. WHEN no corrections are needed, THE Grammar_Extension SHALL display a message in the Chat_Widget informing the user that the text is already well-written

### Requirement 4

**User Story:** As a developer, I want the extension to validate API responses using JSON schema, so that I can ensure data integrity and handle malformed responses appropriately.

#### Acceptance Criteria

1. WHEN the LLM_API returns a response, THE Grammar_Extension SHALL validate the response structure against the predefined JSON_Schema
2. WHEN response validation fails, THE Grammar_Extension SHALL log the error and display a user-friendly message
3. WHEN the response contains required fields (corrected text and explanation), THE Grammar_Extension SHALL proceed with text replacement
4. WHEN the response is missing required fields, THE Grammar_Extension SHALL reject the response and maintain the original text
5. WHEN parsing JSON responses, THE Grammar_Extension SHALL handle malformed JSON gracefully

### Requirement 5

**User Story:** As a user, I want to work with selected text portions, so that I can focus corrections on specific parts of my document without processing the entire content.

#### Acceptance Criteria

1. WHEN a user selects text in the editor and clicks a Correction_Button, THE Grammar_Extension SHALL process only the Selected_Text
2. WHEN no text is selected and a Correction_Button is clicked, THE Grammar_Extension SHALL process the entire Document_Text
3. WHEN Selected_Text is processed, THE Grammar_Extension SHALL send only the selected portion to the LLM_API
4. WHEN corrections are applied to Selected_Text, THE Grammar_Extension SHALL replace only the selected portion in the editor
5. WHEN Selected_Text corrections are displayed in the Chat_Widget, THE Grammar_Extension SHALL clearly indicate which portion of text was processed

### Requirement 6

**User Story:** As a user, I want to create and manage custom name-prompt pairs through VSCode settings, so that I can define my own correction types and prompts that match my specific needs.

#### Acceptance Criteria

1. WHEN a user accesses VSCode settings, THE Grammar_Extension SHALL provide an interface to create, edit, and delete custom name-prompt pairs
2. WHEN a user creates a new name-prompt pair, THE Grammar_Extension SHALL add a corresponding Correction_Button to the Chat_Widget
3. WHEN a user modifies an existing name-prompt pair, THE Grammar_Extension SHALL update the button label and associated prompt
4. WHEN a user deletes a name-prompt pair, THE Grammar_Extension SHALL remove the corresponding Correction_Button from the Chat_Widget
5. WHEN custom prompts are configured, THE Grammar_Extension SHALL persist all name-prompt pairs in VSCode settings
6. WHEN the Chat_Widget loads, THE Grammar_Extension SHALL display Correction_Buttons for all configured name-prompt pairs
7. WHEN invalid prompt content is provided, THE Grammar_Extension SHALL validate the input and display appropriate error messages
8. WHEN duplicate names are entered, THE Grammar_Extension SHALL prevent creation and display a conflict error message

### Requirement 7

**User Story:** As a user, I want a chat-style interface for viewing LLM responses, so that I can easily review corrections and maintain a conversation history with the AI assistant.

#### Acceptance Criteria

1. WHEN the Grammar_Extension is activated, THE Grammar_Extension SHALL display a Chat_Widget as a VSCode panel
2. WHEN a correction request is made, THE Grammar_Extension SHALL display the user's request context in the Chat_Widget
3. WHEN the LLM_API returns a response, THE Grammar_Extension SHALL display the response as a message in the Chat_Widget with proper formatting
4. WHEN multiple correction requests are made, THE Grammar_Extension SHALL maintain a conversation history in the Chat_Widget
5. WHEN LLM responses contain corrected text, THE Grammar_Extension SHALL provide action buttons to apply or dismiss the corrections
6. WHEN the Chat_Widget displays messages, THE Grammar_Extension SHALL clearly distinguish between user requests and LLM responses
7. WHEN the Chat_Widget is closed and reopened, THE Grammar_Extension SHALL preserve the conversation history for the current session