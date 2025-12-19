import { ChatMessage, MessageAction } from '../models/ChatMessage';
import { CorrectionResponse } from '../models/CorrectionResponse';
import { TextChange } from '../models/TextChange';

export class MessageRenderer {
    
    /**
     * Creates a user message for a correction request
     */
    public createUserMessage(
        promptName: string,
        text: string,
        isSelection: boolean = false,
        selectionRange?: { start: number; end: number }
    ): ChatMessage {
        const content = isSelection 
            ? `Requesting ${promptName} correction for selected text (${text.length} characters)`
            : `Requesting ${promptName} correction for document (${text.length} characters)`;

        return {
            id: this.generateMessageId(),
            type: 'user',
            content,
            timestamp: new Date(),
            promptName,
            isSelection,
            selectionRange
        };
    }

    /**
     * Creates an assistant message from a correction response
     */
    public createAssistantMessage(
        correctionResponse: CorrectionResponse,
        originalText: string,
        promptName?: string
    ): ChatMessage {
        const content = this.formatCorrectionResponse(correctionResponse, originalText);
        const actions = this.createMessageActions(correctionResponse);

        return {
            id: this.generateMessageId(),
            type: 'assistant',
            content,
            timestamp: new Date(),
            promptName,
            actions
        };
    }

    /**
     * Creates an error message for display in chat
     */
    public createErrorMessage(error: string, promptName?: string): ChatMessage {
        return {
            id: this.generateMessageId(),
            type: 'assistant',
            content: `❌ Error: ${error}`,
            timestamp: new Date(),
            promptName
        };
    }

    /**
     * Creates a no-changes message when text is already good
     */
    public createNoChangesMessage(promptName?: string): ChatMessage {
        return {
            id: this.generateMessageId(),
            type: 'assistant',
            content: `✅ Great! Your text looks good and doesn't need any ${promptName?.toLowerCase() || 'corrections'}.`,
            timestamp: new Date(),
            promptName
        };
    }

    /**
     * Formats a correction response into readable chat content
     */
    private formatCorrectionResponse(response: CorrectionResponse, originalText: string): string {
        let content = '';

        // Add explanation if available
        if (response.explanation) {
            content += `📝 **Analysis:**\n${response.explanation}\n\n`;
        }

        // Add corrected text
        if (response.correctedText && response.correctedText !== originalText) {
            content += `✏️ **Corrected Text:**\n${response.correctedText}\n\n`;
        }

        // Add detailed changes if available
        if (response.changes && response.changes.length > 0) {
            content += `🔍 **Changes Made:**\n`;
            response.changes.forEach((change, index) => {
                content += `${index + 1}. "${change.original}" → "${change.corrected}"\n`;
                if (change.reason) {
                    content += `   Reason: ${change.reason}\n`;
                }
            });
            content += '\n';
        }

        // Add confidence if available
        if (response.confidence !== undefined) {
            const confidencePercent = Math.round(response.confidence * 100);
            content += `🎯 **Confidence:** ${confidencePercent}%`;
        }

        return content.trim();
    }

    /**
     * Creates action buttons for correction messages
     */
    private createMessageActions(response: CorrectionResponse): MessageAction[] {
        const actions: MessageAction[] = [];

        // Only add apply/dismiss actions if there are actual corrections
        if (response.correctedText && response.changes && response.changes.length > 0) {
            actions.push({
                id: this.generateActionId(),
                label: 'Apply Changes',
                type: 'apply',
                data: {
                    correctedText: response.correctedText,
                    changes: response.changes
                }
            });

            actions.push({
                id: this.generateActionId(),
                label: 'Dismiss',
                type: 'dismiss'
            });
        }

        // Always add copy action for the corrected text
        if (response.correctedText) {
            actions.push({
                id: this.generateActionId(),
                label: 'Copy Text',
                type: 'copy',
                data: {
                    text: response.correctedText
                }
            });
        }

        return actions;
    }

    /**
     * Formats text changes for display
     */
    public formatTextChanges(changes: TextChange[]): string {
        if (!changes || changes.length === 0) {
            return 'No specific changes to highlight.';
        }

        let formatted = 'Changes made:\n';
        changes.forEach((change, index) => {
            formatted += `${index + 1}. "${change.original}" → "${change.corrected}"`;
            if (change.reason) {
                formatted += ` (${change.reason})`;
            }
            formatted += '\n';
        });

        return formatted;
    }

    /**
     * Truncates text for display in messages
     */
    public truncateText(text: string, maxLength: number = 100): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Formats timestamp for display
     */
    public formatTimestamp(timestamp: Date): string {
        return timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Determines if messages should be visually distinguished
     */
    public getMessageDisplayClass(message: ChatMessage): string {
        const baseClass = `message ${message.type}`;
        
        if (message.type === 'user') {
            return `${baseClass} user-request`;
        } else {
            // Assistant messages can have different styles based on content
            if (message.content.includes('❌')) {
                return `${baseClass} error-message`;
            } else if (message.content.includes('✅')) {
                return `${baseClass} success-message`;
            } else {
                return `${baseClass} correction-message`;
            }
        }
    }

    /**
     * Validates message content for display
     */
    public validateMessageContent(message: ChatMessage): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!message.id) {
            errors.push('Message ID is required');
        }

        if (!message.type || !['user', 'assistant'].includes(message.type)) {
            errors.push('Message type must be "user" or "assistant"');
        }

        if (!message.content || message.content.trim() === '') {
            errors.push('Message content cannot be empty');
        }

        if (!message.timestamp) {
            errors.push('Message timestamp is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateActionId(): string {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}