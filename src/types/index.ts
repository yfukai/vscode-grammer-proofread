/**
 * Core interfaces for the Grammar Proofreading Extension
 */

/**
 * Represents a user-defined custom prompt for text correction
 */
export interface CustomPrompt {
  /** Unique identifier for the prompt */
  id: string;
  /** User-friendly display name (1-100 characters, unique) */
  name: string;
  /** Prompt text content (1-2000 characters) */
  content: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Configuration container for all prompt-related settings
 */
export interface PromptConfiguration {
  /** Array of user-defined custom prompts */
  customPrompts: CustomPrompt[];
  /** Global prompt text appended to all custom prompts (0-2000 characters) */
  sharedPrompt: string;
}

/**
 * Represents a text selection in the VSCode editor
 */
export interface TextSelection {
  /** URI of the document containing the selection */
  documentUri: string;
  /** Starting line number (0-based) */
  startLine: number;
  /** Starting character position (0-based) */
  startCharacter: number;
  /** Ending line number (0-based) */
  endLine: number;
  /** Ending character position (0-based) */
  endCharacter: number;
}

/**
 * Represents an active correction task for concurrency control
 */
export interface ActiveTask {
  /** Unique identifier for the task */
  id: string;
  /** Text selection being processed */
  selection: TextSelection;
  /** Task start timestamp */
  startTime: Date;
}

/**
 * Request object for text correction operations
 */
export interface CorrectionRequest {
  /** ID of the custom prompt to use */
  promptId: string;
  /** Text content to be corrected */
  text: string;
  /** Selection information */
  selection: TextSelection;
  /** Whether this is a full document correction */
  isFullDocument: boolean;
}

/**
 * Response object from LLM API
 */
export interface CorrectionResponse {
  /** Corrected text content */
  correctedText: string;
  /** Optional explanation of changes made */
  explanation?: string;
}

/**
 * LLM API configuration settings
 */
export interface LLMApiConfiguration {
  /** API endpoint URL */
  endpoint: string;
  /** API authentication key */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for response generation */
  temperature: number;
}

/**
 * Chat message for the chat widget interface
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Message type */
  type: 'request' | 'response' | 'error';
  /** Message content */
  content: string;
  /** Name of the prompt used */
  promptName: string;
  /** Message timestamp */
  timestamp: Date;
}