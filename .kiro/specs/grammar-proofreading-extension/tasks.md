# Implementation Plan

- [x] 1. Update data models for chat widget and text selection
  - Create ChatMessage and MessageAction interfaces for chat functionality
  - Update CorrectionRequest to include selection information (isSelection, selectionRange)
  - Replace CorrectionType enum with NamePromptPair interface
  - Add ConversationHistory interface for chat session management
  - _Requirements: 1.1, 5.1, 6.1_

- [x] 1.1 Write property test for text selection detection
  - **Property 1: Button click captures correct text based on selection state**
  - **Validates: Requirements 1.2, 5.1, 5.2**

- [x] 2. Implement text selection management
  - Create SelectionManager service to detect and handle text selections
  - Update TextProcessor to handle both full document and selected text
  - Add selection range tracking and validation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.1 Write property test for selection processing
  - **Property 14: Selection processing sends only selected text**
  - **Property 15: Selection corrections replace only selected portion**
  - **Validates: Requirements 5.3, 5.4**

- [x] 3. Create chat widget UI components
  - Implement ChatWidget as VSCode webview panel
  - Create MessageRenderer for displaying chat messages with proper formatting
  - Add ConversationManager for handling message history and threading
  - Implement dynamic button generation based on configured name-prompt pairs
  - _Requirements: 1.1, 7.1, 7.6_

- [x] 3.1 Write property test for chat widget functionality
  - **Property 23: Correction requests display in chat**
  - **Property 25: Messages are visually distinguished**
  - **Validates: Requirements 7.2, 7.6**

- [-] 4. Update configuration system for name-prompt pairs
  - Replace fixed prompt categories with dynamic NamePromptPair management
  - Update ConfigurationProvider to handle CRUD operations for name-prompt pairs
  - Add validation for unique names and non-empty prompts
  - Implement settings schema for array-based name-prompt configuration
  - _Requirements: 6.1, 6.7, 6.8_

- [ ] 4.1 Write property test for name-prompt pair management
  - **Property 17: Name-prompt pair creation adds button**
  - **Property 18: Name-prompt pair modification updates button**
  - **Property 19: Name-prompt pair deletion removes button**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ] 4.2 Write property test for configuration validation
  - **Property 21: Invalid prompt content is validated**
  - **Property 22: Duplicate names are prevented**
  - **Validates: Requirements 6.7, 6.8**

- [ ] 5. Update LLM API integration for chat workflow
  - Modify RequestBuilder to handle selection-based requests
  - Update ResponseParser to format responses for chat display
  - Add support for indicating processed text portion in API requests
  - _Requirements: 1.3, 5.3, 5.5_

- [ ] 5.1 Write property test for API integration updates
  - **Property 2: Text capture triggers API request with correct prompt**
  - **Property 16: Selection corrections indicate processed portion**
  - **Validates: Requirements 1.3, 5.5**

- [ ] 6. Implement chat message handling and display
  - Create message formatting logic for user requests and LLM responses
  - Add action buttons (apply, dismiss) to correction messages
  - Implement conversation history persistence for current session
  - Add support for displaying multiple corrections with explanations
  - _Requirements: 1.5, 1.6, 3.2, 7.3, 7.4_

- [ ] 6.1 Write property test for message handling
  - **Property 4: Valid responses display in chat widget with actions**
  - **Property 9: Multiple corrections provide individual explanations**
  - **Property 24: Conversation history is maintained**
  - **Validates: Requirements 1.5, 1.6, 3.3, 7.4**

- [ ] 7. Update CorrectionService for chat workflow
  - Modify correction orchestration to work with chat widget
  - Add support for applying corrections from chat action buttons
  - Update workflow to display responses in chat instead of direct text replacement
  - Implement selection-aware correction processing
  - _Requirements: 3.1, 3.2, 5.4_

- [ ] 7.1 Write property test for correction service updates
  - **Property 8: Correction responses extract required data**
  - **Validates: Requirements 3.1**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update VSCode extension integration
  - Modify extension activation to create chat widget panel
  - Update command registration to work with dynamic name-prompt pairs
  - Add chat widget lifecycle management (open, close, preserve history)
  - _Requirements: 1.1, 7.1, 7.7_

- [ ] 9.1 Write property test for extension integration
  - **Property 26: Session history persists across widget lifecycle**
  - **Validates: Requirements 7.7**

- [ ] 10. Implement settings integration for name-prompt pairs
  - Update package.json to define array-based settings schema for name-prompt pairs
  - Add settings UI for creating, editing, and deleting name-prompt pairs
  - Implement real-time chat widget updates when settings change
  - _Requirements: 6.1, 6.2, 6.6_

- [ ] 10.1 Write property test for settings integration
  - **Property 20: Name-prompt configuration round-trip**
  - **Validates: Requirements 6.5, 6.6**

- [ ] 11. Add error handling for chat workflow
  - Update error handling to display errors in chat widget
  - Add graceful handling of API failures with chat notifications
  - Implement validation error display for malformed responses
  - _Requirements: 2.2, 2.4, 4.2, 4.4, 4.5_

- [ ] 11.1 Write property test for error handling
  - **Property 5: Invalid credentials prevent API calls**
  - **Property 7: Network errors are handled gracefully**
  - **Property 10: Validation failures are logged and reported**
  - **Property 12: Missing fields cause response rejection**
  - **Property 13: Malformed JSON is handled gracefully**
  - **Validates: Requirements 2.2, 2.4, 4.2, 4.4, 4.5**

- [ ] 12. Update API response validation
  - Ensure JSON schema validation works with chat workflow
  - Add validation for chat-specific response formatting
  - Update response processing to handle chat display requirements
  - _Requirements: 1.4, 4.1, 4.3_

- [ ] 12.1 Write property test for response validation
  - **Property 3: API response validation occurs**
  - **Property 11: Valid responses proceed to processing**
  - **Validates: Requirements 1.4, 4.1, 4.3**

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Update extension packaging and configuration
  - Update package.json with new chat widget and settings contributions
  - Add webview permissions for chat widget functionality
  - Update extension manifest for new UI components
  - _Requirements: 1.1, 6.1_

- [ ] 14.1 Write integration tests for complete chat workflow
  - Test end-to-end correction workflow through chat widget
  - Test name-prompt pair management and chat button updates
  - Test text selection and chat display integration
  - _Requirements: All requirements (integration testing)_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.