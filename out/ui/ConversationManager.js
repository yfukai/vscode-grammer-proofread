"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationManager = void 0;
class ConversationManager {
    constructor() {
        this.conversations = new Map();
        this.maxMessagesPerSession = 100;
        this.maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.currentSessionId = this.generateSessionId();
        this.initializeCurrentSession();
    }
    /**
     * Gets the current conversation history
     */
    getCurrentConversation() {
        const conversation = this.conversations.get(this.currentSessionId);
        if (!conversation) {
            this.initializeCurrentSession();
            return this.conversations.get(this.currentSessionId);
        }
        return conversation;
    }
    /**
     * Adds a message to the current conversation
     */
    addMessage(message) {
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
    getMessages() {
        return this.getCurrentConversation().messages;
    }
    /**
     * Finds a message by ID in the current conversation
     */
    findMessage(messageId) {
        return this.getCurrentConversation().messages.find(msg => msg.id === messageId);
    }
    /**
     * Updates a message in the current conversation
     */
    updateMessage(messageId, updates) {
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
    removeMessage(messageId) {
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
    clearCurrentConversation() {
        const conversation = this.getCurrentConversation();
        conversation.messages = [];
        conversation.lastActivity = new Date();
        this.conversations.set(this.currentSessionId, conversation);
    }
    /**
     * Starts a new conversation session
     */
    startNewSession() {
        this.currentSessionId = this.generateSessionId();
        this.initializeCurrentSession();
        return this.currentSessionId;
    }
    /**
     * Gets the current session ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    /**
     * Gets conversation statistics
     */
    getConversationStats() {
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
    getMessagesByPrompt(promptName) {
        return this.getCurrentConversation().messages.filter(msg => msg.promptName === promptName);
    }
    /**
     * Gets the last message of a specific type
     */
    getLastMessage(type) {
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
    getMessagesWithActions() {
        return this.getCurrentConversation().messages.filter(msg => msg.actions && msg.actions.length > 0);
    }
    /**
     * Creates a conversation thread for a specific prompt
     */
    getPromptThread(promptName) {
        const messages = this.getCurrentConversation().messages;
        const thread = [];
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
    validateConversation() {
        const errors = [];
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
    exportConversation() {
        return JSON.parse(JSON.stringify(this.getCurrentConversation()));
    }
    /**
     * Imports conversation history from persistence
     */
    importConversation(history) {
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
    cleanupOldConversations() {
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
    getMemoryStats() {
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
    initializeCurrentSession() {
        const now = new Date();
        const conversation = {
            messages: [],
            sessionId: this.currentSessionId,
            createdAt: now,
            lastActivity: now
        };
        this.conversations.set(this.currentSessionId, conversation);
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ConversationManager = ConversationManager;
//# sourceMappingURL=ConversationManager.js.map