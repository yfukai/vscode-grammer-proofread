import { ChatMessage, MessageAction } from '../models/ChatMessage';
import { ConversationHistory } from '../models/ConversationHistory';

export class ConversationManager {
    private conversations: Map<string, ConversationHistory> = new Map();
    private currentSessionId: string;
    private maxMessagesPerSession: number = 100;
    private maxSessionAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    constructor() {
        this.currentSessionId = this.generateSessionId();
        this.initializeCurrentSession();
    }

    /**
     * Gets the current conversation history
     */
    public getCurrentConversation(): ConversationHistory {
        const conversation = this.conversations.get(this.currentSessionId);
        if (!conversation) {
            this.initializeCurrentSession();
            return this.conversations.get(this.currentSessionId)!;
        }
        return conversation;
    }

    /**
     * Adds a message to the current conversation
     */
    public addMessage(message: ChatMessage): void {
        const conversation = this.getCurrentConversation();
        conversation.messages.push(message);
        conversation.lastActivity = new Date();

        // Trim messages if we exceed the limit
        if (conversation.messages.length > this.maxMessagesPerSession) {
            conversation.messages = conversation.messages.slice(-this.maxMessagesPerSession);
        }

        this.conversations.set(this.currentSessionId, conversation);
    }

    /**
     * Gets all messages from the current conversation
     */
    public getMessages(): ChatMessage[] {
        return this.getCurrentConversation().messages;
    }

    /**
     * Finds a message by ID in the current conversation
     */
    public findMessage(messageId: string): ChatMessage | undefined {
        return this.getCurrentConversation().messages.find(msg => msg.id === messageId);
    }

    /**
     * Updates a message in the current conversation
     */
    public updateMessage(messageId: string, updates: Partial<ChatMessage>): boolean {
        const conversation = this.getCurrentConversation();
        const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex === -1) {
            return false;
        }

        conversation.messages[messageIndex] = {
            ...conversation.messages[messageIndex],
            ...updates
        };

        conversation.lastActivity = new Date();
        this.conversations.set(this.currentSessionId, conversation);
        return true;
    }

    /**
     * Removes a message from the current conversation
     */
    public removeMessage(messageId: string): boolean {
        const conversation = this.getCurrentConversation();
        const initialLength = conversation.messages.length;
        
        conversation.messages = conversation.messages.filter(msg => msg.id !== messageId);
        
        if (conversation.messages.length < initialLength) {
            conversation.lastActivity = new Date();
            this.conversations.set(this.currentSessionId, conversation);
            return true;
        }
        
        return false;
    }

    /**
     * Clears all messages from the current conversation
     */
    public clearCurrentConversation(): void {
        const conversation = this.getCurrentConversation();
        conversation.messages = [];
        conversation.lastActivity = new Date();
        this.conversations.set(this.currentSessionId, conversation);
    }

    /**
     * Starts a new conversation session
     */
    public startNewSession(): string {
        this.currentSessionId = this.generateSessionId();
        this.initializeCurrentSession();
        return this.currentSessionId;
    }

    /**
     * Gets the current session ID
     */
    public getCurrentSessionId(): string {
        return this.currentSessionId;
    }

    /**
     * Gets conversation statistics
     */
    public getConversationStats(): {
        totalMessages: number;
        userMessages: number;
        assistantMessages: number;
        sessionAge: number;
        lastActivity: Date;
    } {
        const conversation = this.getCurrentConversation();
        const userMessages = conversation.messages.filter(msg => msg.type === 'user').length;
        const assistantMessages = conversation.messages.filter(msg => msg.type === 'assistant').length;
        const sessionAge = Date.now() - conversation.createdAt.getTime();

        return {
            totalMessages: conversation.messages.length,
            userMessages,
            assistantMessages,
            sessionAge,
            lastActivity: conversation.lastActivity
        };
    }

    /**
     * Gets messages by prompt name
     */
    public getMessagesByPrompt(promptName: string): ChatMessage[] {
        return this.getCurrentConversation().messages.filter(
            msg => msg.promptName === promptName
        );
    }

    /**
     * Gets the last message of a specific type
     */
    public getLastMessage(type?: 'user' | 'assistant'): ChatMessage | undefined {
        const messages = this.getCurrentConversation().messages;
        
        if (!type) {
            return messages[messages.length - 1];
        }

        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === type) {
                return messages[i];
            }
        }

        return undefined;
    }

    /**
     * Finds messages with pending actions
     */
    public getMessagesWithActions(): ChatMessage[] {
        return this.getCurrentConversation().messages.filter(
            msg => msg.actions && msg.actions.length > 0
        );
    }

    /**
     * Creates a conversation thread for a specific prompt
     */
    public getPromptThread(promptName: string): ChatMessage[] {
        const messages = this.getCurrentConversation().messages;
        const thread: ChatMessage[] = [];
        
        // Find all messages related to this prompt
        for (const message of messages) {
            if (message.promptName === promptName) {
                thread.push(message);
            }
        }

        return thread;
    }

    /**
     * Validates conversation integrity
     */
    public validateConversation(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const conversation = this.getCurrentConversation();

        if (!conversation.sessionId) {
            errors.push('Session ID is missing');
        }

        if (!conversation.createdAt) {
            errors.push('Creation date is missing');
        }

        if (!conversation.lastActivity) {
            errors.push('Last activity date is missing');
        }

        // Validate message sequence
        for (let i = 0; i < conversation.messages.length; i++) {
            const message = conversation.messages[i];
            
            if (!message.id) {
                errors.push(`Message at index ${i} is missing ID`);
            }

            if (!message.timestamp) {
                errors.push(`Message at index ${i} is missing timestamp`);
            }

            if (i > 0) {
                const prevMessage = conversation.messages[i - 1];
                if (message.timestamp < prevMessage.timestamp) {
                    errors.push(`Message at index ${i} has timestamp before previous message`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Exports conversation history for persistence
     */
    public exportConversation(): ConversationHistory {
        return JSON.parse(JSON.stringify(this.getCurrentConversation()));
    }

    /**
     * Imports conversation history from persistence
     */
    public importConversation(history: ConversationHistory): void {
        // Validate the imported history
        if (!history.sessionId || !history.messages) {
            throw new Error('Invalid conversation history format');
        }

        this.currentSessionId = history.sessionId;
        this.conversations.set(this.currentSessionId, {
            ...history,
            lastActivity: new Date() // Update last activity to now
        });
    }

    /**
     * Cleans up old conversations
     */
    public cleanupOldConversations(): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, conversation] of this.conversations.entries()) {
            const age = now - conversation.lastActivity.getTime();
            
            if (age > this.maxSessionAge && sessionId !== this.currentSessionId) {
                this.conversations.delete(sessionId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Gets memory usage statistics
     */
    public getMemoryStats(): {
        totalConversations: number;
        totalMessages: number;
        currentSessionMessages: number;
    } {
        let totalMessages = 0;
        
        for (const conversation of this.conversations.values()) {
            totalMessages += conversation.messages.length;
        }

        return {
            totalConversations: this.conversations.size,
            totalMessages,
            currentSessionMessages: this.getCurrentConversation().messages.length
        };
    }

    private initializeCurrentSession(): void {
        const now = new Date();
        const conversation: ConversationHistory = {
            messages: [],
            sessionId: this.currentSessionId,
            createdAt: now,
            lastActivity: now
        };

        this.conversations.set(this.currentSessionId, conversation);
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}