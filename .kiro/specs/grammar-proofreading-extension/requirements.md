# Requirements Document

## Introduction

A VSCode extension that provides grammar correction and proofreading capabilities using Large Language Models (LLM). The extension integrates with OpenAI-compatible APIs to analyze and improve text quality through predefined prompts, returning structured corrections with explanations.

## Glossary

- **Grammar_Extension**: The VSCode extension that provides grammar correction and proofreading functionality
- **LLM_API**: OpenAI-compatible API service that processes text correction requests
- **Correction_Button**: UI element that triggers specific grammar correction prompts
- **Document_Text**: The active text content in the VSCode editor
- **Correction_Response**: Structured JSON response containing corrected text and explanation
- **JSON_Schema**: Validation schema that defines the expected format of API responses
- **Configuration_Settings**: User-configurable API endpoint and authentication settings
- **Default_Prompt**: Built-in prompt template for each correction type that can be customized through settings
- **Prompt_Configuration**: VSCode settings interface that allows users to modify default correction prompts
- **Settings_UI**: VSCode's native settings interface where extension configuration options are displayed

## Requirements

### Requirement 1

**User Story:** As a writer, I want to access grammar correction tools through buttons in VSCode, so that I can quickly improve my text quality without leaving my editor.

#### Acceptance Criteria

1. WHEN the Grammar_Extension is activated, THE Grammar_Extension SHALL display correction buttons in the VSCode interface
2. WHEN a user clicks a Correction_Button, THE Grammar_Extension SHALL capture the current Document_Text from the active editor
3. WHEN Document_Text is captured, THE Grammar_Extension SHALL send the text and associated prompt to the configured LLM_API
4. WHEN the LLM_API returns a response, THE Grammar_Extension SHALL validate the response against the JSON_Schema
5. WHEN validation succeeds, THE Grammar_Extension SHALL replace the original Document_Text with the corrected version

### Requirement 2

**User Story:** As a user, I want to configure the LLM API settings, so that I can connect to my preferred OpenAI-compatible service.

#### Acceptance Criteria

1. WHEN a user accesses extension settings, THE Grammar_Extension SHALL provide configuration options for API endpoint and authentication
2. WHEN invalid API credentials are provided, THE Grammar_Extension SHALL display clear error messages and prevent API calls
3. WHEN API configuration is updated, THE Grammar_Extension SHALL validate the connection before saving settings
4. WHEN API calls fail due to network issues, THE Grammar_Extension SHALL handle errors gracefully and inform the user

### Requirement 3

**User Story:** As a content creator, I want to see explanations for grammar corrections, so that I can learn from the changes and improve my writing skills.

#### Acceptance Criteria

1. WHEN the LLM_API returns a Correction_Response, THE Grammar_Extension SHALL extract both corrected text and explanation
2. WHEN text replacement occurs, THE Grammar_Extension SHALL display the explanation to the user
3. WHEN multiple corrections are made, THE Grammar_Extension SHALL provide explanations for each significant change
4. WHEN no corrections are needed, THE Grammar_Extension SHALL inform the user that the text is already well-written

### Requirement 4

**User Story:** As a developer, I want the extension to validate API responses using JSON schema, so that I can ensure data integrity and handle malformed responses appropriately.

#### Acceptance Criteria

1. WHEN the LLM_API returns a response, THE Grammar_Extension SHALL validate the response structure against the predefined JSON_Schema
2. WHEN response validation fails, THE Grammar_Extension SHALL log the error and display a user-friendly message
3. WHEN the response contains required fields (corrected text and explanation), THE Grammar_Extension SHALL proceed with text replacement
4. WHEN the response is missing required fields, THE Grammar_Extension SHALL reject the response and maintain the original text
5. WHEN parsing JSON responses, THE Grammar_Extension SHALL handle malformed JSON gracefully

### Requirement 5

**User Story:** As a user, I want multiple predefined correction prompts available as buttons, so that I can choose the type of correction that best fits my needs.

#### Acceptance Criteria

1. WHEN the Grammar_Extension loads, THE Grammar_Extension SHALL provide multiple Correction_Buttons for different correction types
2. WHEN a specific Correction_Button is clicked, THE Grammar_Extension SHALL use the associated predefined prompt
3. WHEN sending requests to the LLM_API, THE Grammar_Extension SHALL combine the Document_Text with the selected prompt
4. WHEN different correction types are available, THE Grammar_Extension SHALL clearly label each button with its purpose
5. WHEN prompts are configured, THE Grammar_Extension SHALL allow users to customize or add new correction prompts

### Requirement 6

**User Story:** As a user, I want to configure default correction prompts through VSCode settings, so that I can customize the behavior of each correction type to match my writing style and preferences.

#### Acceptance Criteria

1. WHEN a user accesses VSCode settings, THE Grammar_Extension SHALL provide editable configuration fields for each default correction prompt type
2. WHEN a user modifies a default prompt in settings, THE Grammar_Extension SHALL persist the updated prompt value
3. WHEN a Correction_Button is clicked, THE Grammar_Extension SHALL use the configured prompt from settings if available
4. WHEN no custom prompt is configured for a correction type, THE Grammar_Extension SHALL use the built-in default prompt
5. WHEN a user resets a prompt configuration, THE Grammar_Extension SHALL restore the original built-in default prompt
6. WHEN prompt settings are displayed, THE Grammar_Extension SHALL show clear descriptions for each correction type
7. WHEN invalid prompt content is provided, THE Grammar_Extension SHALL validate the prompt and display appropriate error messages