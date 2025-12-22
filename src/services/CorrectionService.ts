import { CorrectionRequest, CorrectionResponse, TextSelection, ActiveTask } from '../types';
import { LLMApiClient } from './LLMApiClient';
import { PromptManager } from './PromptManager';
import { TaskManager } from './TaskManager';
import { ErrorHandler, ErrorCategory } from './ErrorHandler';

/**
 * Orchestrates text correction operations by coordinating prompt selection,
 * API calls, and text replacement with concurrency control
 */
export class CorrectionService {
    private promptManager: PromptManager;
    private apiClient: LLMApiClient;
    private taskManager: TaskManager;
    private errorHandler?: ErrorHandler;

    constructor(
        promptManager: PromptManager,
        apiClient: LLMApiClient,
        taskManager: TaskManager,
        errorHandler?: ErrorHandler
    ) {
        this.promptManager = promptManager;
        this.apiClient = apiClient;
        this.taskManager = taskManager;
        this.errorHandler = errorHandler;
    }

    /**
     * Executes a text correction request
     * @param request CorrectionRequest containing prompt ID, text, and selection info
     * @returns Promise resolving to CorrectionResponse with corrected text
     * @throws Error if selection is blocked, prompt not found, or API fails
     */
    async executeCorrection(request: CorrectionRequest): Promise<CorrectionResponse> {
        // Check if selection is currently blocked by another task
        if (this.isSelectionBlocked(request.selection)) {
            const error = new Error('Selection is currently being processed by another task');
            this.errorHandler?.handleUserError(error.message, 'Please wait for the current task to complete or select different text.');
            throw error;
        }

        // Start task to block concurrent operations on this selection
        const taskId = this.taskManager.startTask(request.selection);

        try {
            // Get combined prompt (custom + shared)
            const combinedPrompt = this.promptManager.combinePrompts(request.promptId);

            // Send request to LLM API
            const correctedText = await this.apiClient.sendRequest(combinedPrompt, request.text);

            // Validate that we received a meaningful response
            if (!correctedText || correctedText.trim().length === 0) {
                const error = new Error('API returned empty response');
                this.errorHandler?.handleApiError(error);
                throw error;
            }

            this.errorHandler?.showSuccess('Text correction completed successfully');

            return {
                correctedText: correctedText.trim(),
                explanation: `Text corrected using prompt: ${this.promptManager.getPrompt(request.promptId)?.name || 'Unknown'}`
            };

        } catch (error) {
            if (error instanceof Error) {
                // Handle different types of errors appropriately
                if (error.message.includes('API') || error.message.includes('network') || error.message.includes('fetch')) {
                    this.errorHandler?.handleApiError(error);
                } else if (error.message.includes('not found')) {
                    this.errorHandler?.handleValidationError(error.message);
                } else {
                    this.errorHandler?.handleSystemError(error, 'Text correction');
                }
            }
            throw error;
        } finally {
            // Always complete the task to unblock the selection
            this.taskManager.completeTask(taskId);
        }
    }

    /**
     * Checks if a text selection is currently blocked by an active task
     * @param selection TextSelection to check
     * @returns true if selection is blocked, false otherwise
     */
    isSelectionBlocked(selection: TextSelection): boolean {
        return !this.taskManager.canStartTask(selection);
    }

    /**
     * Gets all currently active correction tasks
     * @returns Array of ActiveTask objects
     */
    getActiveTasks(): ActiveTask[] {
        return this.taskManager.getActiveTasks();
    }

    /**
     * Cancels an active correction task
     * @param taskId ID of the task to cancel
     */
    cancelTask(taskId: string): void {
        this.taskManager.completeTask(taskId);
    }

    /**
     * Processes an entire document by applying correction to all text
     * @param documentText Full document text content
     * @param promptId ID of the custom prompt to use
     * @param documentUri URI of the document being processed
     * @returns Promise resolving to corrected document text
     * @throws Error if document is empty or processing fails
     */
    async processFullDocument(
        documentText: string, 
        promptId: string, 
        documentUri: string
    ): Promise<string> {
        // Validate document content
        if (!documentText || documentText.trim().length === 0) {
            const error = new Error('Document is empty');
            this.errorHandler?.handleUserError(error.message, 'Please open a document with content to process.');
            throw error;
        }

        // Create a selection representing the entire document
        const lines = documentText.split('\n');
        const fullDocumentSelection: TextSelection = {
            documentUri,
            startLine: 0,
            startCharacter: 0,
            endLine: lines.length - 1,
            endCharacter: lines[lines.length - 1].length
        };

        // Create correction request for full document
        const request: CorrectionRequest = {
            promptId,
            text: documentText,
            selection: fullDocumentSelection,
            isFullDocument: true
        };

        try {
            // Execute correction
            const response = await this.executeCorrection(request);
            this.errorHandler?.showSuccess('Full document processing completed successfully');
            return response.correctedText;
        } catch (error) {
            if (error instanceof Error) {
                this.errorHandler?.handleError(error, 'Full document processing');
            }
            throw error;
        }
    }

    /**
     * Replaces text in a specific selection with corrected text
     * @param originalText Original full text content
     * @param selection TextSelection indicating what to replace
     * @param correctedText New text to insert
     * @returns Updated text with replacement applied
     */
    replaceTextInSelection(
        originalText: string, 
        selection: TextSelection, 
        correctedText: string
    ): string {
        const lines = originalText.split('\n');
        
        // Validate selection bounds
        if (selection.startLine < 0 || selection.startLine >= lines.length ||
            selection.endLine < 0 || selection.endLine >= lines.length ||
            selection.startLine > selection.endLine) {
            throw new Error('Invalid selection bounds');
        }

        // Handle single line selection
        if (selection.startLine === selection.endLine) {
            const line = lines[selection.startLine];
            const before = line.substring(0, selection.startCharacter);
            const after = line.substring(selection.endCharacter);
            lines[selection.startLine] = before + correctedText + after;
        } else {
            // Handle multi-line selection
            const startLine = lines[selection.startLine];
            const endLine = lines[selection.endLine];
            
            const before = startLine.substring(0, selection.startCharacter);
            const after = endLine.substring(selection.endCharacter);
            
            // Split corrected text into lines
            const correctedLines = correctedText.split('\n');
            
            // Create the replacement content
            let replacementLines: string[];
            if (correctedLines.length === 1) {
                // Single line replacement
                replacementLines = [before + correctedText + after];
            } else {
                // Multi-line replacement
                replacementLines = [
                    before + correctedLines[0],
                    ...correctedLines.slice(1, -1),
                    correctedLines[correctedLines.length - 1] + after
                ];
            }
            
            // Remove original lines and insert new ones
            lines.splice(selection.startLine, selection.endLine - selection.startLine + 1, ...replacementLines);
        }

        return lines.join('\n');
    }

    /**
     * Validates that a text selection is accurate for the given text
     * @param text Text content to validate against
     * @param selection TextSelection to validate
     * @returns true if selection is valid, false otherwise
     */
    validateSelection(text: string, selection: TextSelection): boolean {
        const lines = text.split('\n');
        
        // Check line bounds
        if (selection.startLine < 0 || selection.startLine >= lines.length ||
            selection.endLine < 0 || selection.endLine >= lines.length ||
            selection.startLine > selection.endLine) {
            return false;
        }

        // Check character bounds for start line
        const startLine = lines[selection.startLine];
        if (selection.startCharacter < 0 || selection.startCharacter > startLine.length) {
            return false;
        }

        // Check character bounds for end line
        const endLine = lines[selection.endLine];
        if (selection.endCharacter < 0 || selection.endCharacter > endLine.length) {
            return false;
        }

        // For single line selections, start character must be <= end character
        if (selection.startLine === selection.endLine && 
            selection.startCharacter > selection.endCharacter) {
            return false;
        }

        return true;
    }

    /**
     * Extracts the text content from a selection
     * @param text Full text content
     * @param selection TextSelection to extract from
     * @returns Selected text content
     * @throws Error if selection is invalid
     */
    extractSelectedText(text: string, selection: TextSelection): string {
        if (!this.validateSelection(text, selection)) {
            throw new Error('Invalid text selection');
        }

        const lines = text.split('\n');

        // Handle single line selection
        if (selection.startLine === selection.endLine) {
            const line = lines[selection.startLine];
            return line.substring(selection.startCharacter, selection.endCharacter);
        }

        // Handle multi-line selection
        const selectedLines: string[] = [];
        
        // First line (partial)
        const firstLine = lines[selection.startLine];
        selectedLines.push(firstLine.substring(selection.startCharacter));
        
        // Middle lines (complete)
        for (let i = selection.startLine + 1; i < selection.endLine; i++) {
            selectedLines.push(lines[i]);
        }
        
        // Last line (partial)
        const lastLine = lines[selection.endLine];
        selectedLines.push(lastLine.substring(0, selection.endCharacter));
        
        return selectedLines.join('\n');
    }

    /**
     * Updates the API client configuration
     * @param apiClient New LLMApiClient instance
     */
    updateApiClient(apiClient: LLMApiClient): void {
        this.apiClient = apiClient;
    }

    /**
     * Updates the prompt manager
     * @param promptManager New PromptManager instance
     */
    updatePromptManager(promptManager: PromptManager): void {
        this.promptManager = promptManager;
    }

    /**
     * Updates the error handler instance
     * @param errorHandler New ErrorHandler instance
     */
    updateErrorHandler(errorHandler: ErrorHandler): void {
        this.errorHandler = errorHandler;
    }

    /**
     * Gets statistics about correction operations
     * @returns Object containing operation statistics
     */
    getStatistics(): {
        activeTasks: number;
        totalTasksStarted: number;
        totalTasksCompleted: number;
    } {
        const activeTasks = this.taskManager.getActiveTasks();
        return {
            activeTasks: activeTasks.length,
            totalTasksStarted: this.taskManager.getTotalTasksStarted(),
            totalTasksCompleted: this.taskManager.getTotalTasksCompleted()
        };
    }
}