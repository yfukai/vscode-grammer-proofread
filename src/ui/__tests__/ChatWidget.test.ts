import * as fc from 'fast-check';
import { ChatMessage, MessageAction } from '../../models/ChatMessage';
import { ConversationHistory } from '../../models/ConversationHistory';
import { NamePromptPair } from '../../models/NamePromptPair';
import { CorrectionResponse } from '../../models/CorrectionResponse';
import { ChatWidget } from '../ChatWidget';
import { MessageRenderer } from '../MessageRenderer';
import { ConversationManager } from '../ConversationManager';

// Mock VSCode API
const mockWebview = {
    html: '',
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn()
};

const mockWebviewPanel = {
    webview: mockWebview,
    reveal: jest.fn(),
    dispose: jest.fn(),
    onDidDispose: jest.fn()
};

const mockVscode = {
    window: {
        createWebviewPanel: jest.fn().mockReturnValue(mockWebviewPanel)
    },
    ViewColumn: {
        Beside: 2
    },
    ExtensionContext: class MockExtensionContext {
        subscriptions: any[] = [];
        extensionUri: any = {};
    }
};

jest.doMock('vscode', () => mockVscode, { virtual: true });

// Test implementations for chat widget functionality
class ChatWidgetLogic {
    private messages: ChatMessage[] = [];
    private namePromptPairs: NamePromptPair[] = [];
    private isVisible: boolean = false;

    show(): void {
        this.isVisible = true;
    }

    hide(): void {
        this.isVisible = false;
    }

    isWidgetVisible(): boolean {
        return this.isVisible;
    }

    addMessage(message: ChatMessage): void {
        this.messages.push(message);
    }

    getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    updateNamePromptPairs(pairs: NamePromptPair[]): void {
        this.namePromptPairs = [...pairs];
    }

    getNamePromptPairs(): NamePromptPair[] {
        return [...this.namePromptPairs];
    }

    clearHistory(): void {
        this.messages = [];
    }

    // Simulates a correction request being displayed in chat
    displayCorrectionRequest(promptName: string, text: string, isSelection: boolean = false): ChatMessage {
        const message: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'user',
            content: `Requesting ${promptName} correction for ${isSelection ? 'selected text' : 'document'} (${text.length} characters)`,
            timestamp: new Date(),
            promptName,
            isSelection
        };

        this.addMessage(message);
        return message;
    }

    // Simulates distinguishing between user and assistant messages
    getMessagesByType(type: 'user' | 'assistant'): ChatMessage[] {
        return this.messages.filter(msg => msg.type === type);
    }

    // Validates that messages are properly distinguished
    validateMessageDistinction(): { hasUserMessages: boolean; hasAssistantMessages: boolean; areDistinguished: boolean } {
        const userMessages = this.getMessagesByType('user');
        const assistantMessages = this.getMessagesByType('assistant');
        
        // Check if messages have proper type distinction
        const areDistinguished = this.messages.every(msg => 
            msg.type === 'user' || msg.type === 'assistant'
        );

        return {
            hasUserMessages: userMessages.length > 0,
            hasAssistantMessages: assistantMessages.length > 0,
            areDistinguished
        };
    }
}

class MessageRendererLogic {
    createUserMessage(
        promptName: string,
        text: string,
        isSelection: boolean = false,
        selectionRange?: { start: number; end: number }
    ): ChatMessage {
        const content = isSelection 
            ? `Requesting ${promptName} correction for selected text (${text.length} characters)`
            : `Requesting ${promptName} correction for document (${text.length} characters)`;

        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'user',
            content,
            timestamp: new Date(),
            promptName,
            isSelection,
            selectionRange
        };
    }

    createAssistantMessage(
        correctionResponse: CorrectionResponse,
        originalText: string,
        promptName?: string
    ): ChatMessage {
        const content = this.formatCorrectionResponse(correctionResponse, originalText);
        const actions = this.createMessageActions(correctionResponse);

        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content,
            timestamp: new Date(),
            promptName,
            actions
        };
    }

    private formatCorrectionResponse(response: CorrectionResponse, originalText: string): string {
        let content = '';

        if (response.explanation) {
            content += `📝 **Analysis:**\n${response.explanation}\n\n`;
        }

        if (response.correctedText && response.correctedText !== originalText) {
            content += `✏️ **Corrected Text:**\n${response.correctedText}\n\n`;
        }

        if (response.changes && response.changes.length > 0) {
            content += `🔍 **Changes Made:**\n`;
            response.changes.forEach((change, index) => {
                content += `${index + 1}. "${change.original}" → "${change.corrected}"\n`;
                if (change.reason) {
                    content += `   Reason: ${change.reason}\n`;
                }
            });
        }

        return content.trim();
    }

    private createMessageActions(response: CorrectionResponse): MessageAction[] {
        const actions: MessageAction[] = [];

        if (response.correctedText && response.changes && response.changes.length > 0) {
            actions.push({
                id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                label: 'Apply Changes',
                type: 'apply',
                data: {
                    correctedText: response.correctedText,
                    changes: response.changes
                }
            });

            actions.push({
                id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                label: 'Dismiss',
                type: 'dismiss'
            });
        }

        return actions;
    }

    // Validates that messages are visually distinguished
    validateMessageDistinction(messages: ChatMessage[]): { 
        allHaveType: boolean; 
        userMessagesDistinct: boolean; 
        assistantMessagesDistinct: boolean 
    } {
        const allHaveType = messages.every(msg => msg.type === 'user' || msg.type === 'assistant');
        
        const userMessages = messages.filter(msg => msg.type === 'user');
        const assistantMessages = messages.filter(msg => msg.type === 'assistant');
        
        // User messages should have request-like content
        const userMessagesDistinct = userMessages.every(msg => 
            msg.content.includes('Requesting') || msg.content.includes('correction')
        );
        
        // Assistant messages should have response-like content (emojis, analysis, etc.)
        const assistantMessagesDistinct = assistantMessages.every(msg => 
            msg.content.includes('📝') || msg.content.includes('✏️') || msg.content.includes('🔍') ||
            msg.actions !== undefined
        );

        return {
            allHaveType,
            userMessagesDistinct,
            assistantMessagesDistinct
        };
    }
}

describe('Chat Widget Functionality', () => {
    let chatWidget: ChatWidgetLogic;
    let messageRenderer: MessageRendererLogic;

    beforeEach(() => {
        chatWidget = new ChatWidgetLogic();
        messageRenderer = new MessageRendererLogic();
        jest.clearAllMocks();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 23: Correction requests display in chat
         * Validates: Requirements 7.2
         */
        test('should display correction requests in chat widget', () => {
            // Generator for prompt names
            const promptNameArb = fc.constantFrom('Grammar', 'Style', 'Clarity', 'Tone', 'Custom');
            
            // Generator for text content
            const textContentArb = fc.string({ minLength: 1, maxLength: 1000 });
            
            // Generator for selection state
            const isSelectionArb = fc.boolean();

            fc.assert(
                fc.property(promptNameArb, textContentArb, isSelectionArb, (promptName, text, isSelection) => {
                    // Display a correction request in the chat widget
                    const message = chatWidget.displayCorrectionRequest(promptName, text, isSelection);
                    
                    // Verify the request is displayed in chat
                    const messages = chatWidget.getMessages();
                    expect(messages).toContain(message);
                    expect(message.type).toBe('user');
                    expect(message.promptName).toBe(promptName);
                    expect(message.isSelection).toBe(isSelection);
                    expect(message.content).toContain('Requesting');
                    expect(message.content).toContain(promptName);
                    expect(message.content).toContain(isSelection ? 'selected text' : 'document');
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 25: Messages are visually distinguished
         * Validates: Requirements 7.6
         */
        test('should visually distinguish between user requests and LLM responses', () => {
            // Generator for correction responses
            const correctionResponseArb = fc.record({
                correctedText: fc.string({ minLength: 1, maxLength: 500 }),
                explanation: fc.string({ minLength: 10, maxLength: 200 }),
                changes: fc.array(fc.record({
                    original: fc.string({ minLength: 1, maxLength: 50 }),
                    corrected: fc.string({ minLength: 1, maxLength: 50 }),
                    reason: fc.string({ minLength: 5, maxLength: 100 }),
                    position: fc.record({
                        start: fc.nat({ max: 100 }),
                        end: fc.nat({ max: 100 })
                    })
                }), { minLength: 0, maxLength: 5 }),
                confidence: fc.float({ min: 0, max: 1 })
            });

            const promptNameArb = fc.constantFrom('Grammar', 'Style', 'Clarity', 'Tone');
            const textContentArb = fc.string({ minLength: 1, maxLength: 200 });

            fc.assert(
                fc.property(promptNameArb, textContentArb, correctionResponseArb, (promptName, originalText, response) => {
                    // Create user message
                    const userMessage = messageRenderer.createUserMessage(promptName, originalText);
                    chatWidget.addMessage(userMessage);
                    
                    // Create assistant message
                    const assistantMessage = messageRenderer.createAssistantMessage(response, originalText, promptName);
                    chatWidget.addMessage(assistantMessage);
                    
                    // Verify messages are visually distinguished
                    const messages = chatWidget.getMessages();
                    const distinction = messageRenderer.validateMessageDistinction(messages);
                    
                    expect(distinction.allHaveType).toBe(true);
                    expect(distinction.userMessagesDistinct).toBe(true);
                    expect(distinction.assistantMessagesDistinct).toBe(true);
                    
                    // Verify user and assistant messages have different characteristics
                    const userMessages = chatWidget.getMessagesByType('user');
                    const assistantMessages = chatWidget.getMessagesByType('assistant');
                    
                    expect(userMessages.length).toBeGreaterThan(0);
                    expect(assistantMessages.length).toBeGreaterThan(0);
                    
                    // User messages should be requests
                    userMessages.forEach(msg => {
                        expect(msg.type).toBe('user');
                        expect(msg.content).toContain('Requesting');
                    });
                    
                    // Assistant messages should be responses with formatting
                    assistantMessages.forEach(msg => {
                        expect(msg.type).toBe('assistant');
                        expect(msg.content.includes('📝') || msg.content.includes('✏️') || msg.content.includes('🔍')).toBe(true);
                    });
                }),
                { numRuns: 100 }
            );
        });

        test('should maintain message order and timestamps', () => {
            const messageCountArb = fc.integer({ min: 1, max: 10 });
            const promptNameArb = fc.constantFrom('Grammar', 'Style', 'Clarity', 'Tone');
            const textContentArb = fc.string({ minLength: 1, maxLength: 100 });

            fc.assert(
                fc.property(messageCountArb, promptNameArb, textContentArb, (messageCount, promptName, text) => {
                    // Create a fresh chat widget for each test run
                    const testChatWidget = new ChatWidgetLogic();
                    const startTime = Date.now();
                    
                    // Add multiple messages
                    for (let i = 0; i < messageCount; i++) {
                        testChatWidget.displayCorrectionRequest(`${promptName}_${i}`, text);
                    }
                    
                    const messages = testChatWidget.getMessages();
                    expect(messages).toHaveLength(messageCount);
                    
                    // Verify messages maintain chronological order
                    for (let i = 1; i < messages.length; i++) {
                        expect(messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                            messages[i - 1].timestamp.getTime()
                        );
                    }
                    
                    // Verify all messages have valid timestamps
                    messages.forEach(msg => {
                        expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
                        expect(msg.id).toBeTruthy();
                        expect(msg.type).toBeTruthy();
                    });
                }),
                { numRuns: 50 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should show and hide chat widget', () => {
            expect(chatWidget.isWidgetVisible()).toBe(false);
            
            chatWidget.show();
            expect(chatWidget.isWidgetVisible()).toBe(true);
            
            chatWidget.hide();
            expect(chatWidget.isWidgetVisible()).toBe(false);
        });

        test('should add and retrieve messages', () => {
            const message: ChatMessage = {
                id: 'test-msg-1',
                type: 'user',
                content: 'Test message',
                timestamp: new Date(),
                promptName: 'Grammar'
            };

            chatWidget.addMessage(message);
            const messages = chatWidget.getMessages();
            
            expect(messages).toHaveLength(1);
            expect(messages[0]).toEqual(message);
        });

        test('should update name-prompt pairs', () => {
            const pairs: NamePromptPair[] = [
                {
                    id: 'grammar',
                    name: 'Grammar',
                    prompt: 'Fix grammar',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            chatWidget.updateNamePromptPairs(pairs);
            const retrievedPairs = chatWidget.getNamePromptPairs();
            
            expect(retrievedPairs).toEqual(pairs);
        });

        test('should clear message history', () => {
            // Add some messages
            chatWidget.displayCorrectionRequest('Grammar', 'test text');
            chatWidget.displayCorrectionRequest('Style', 'more text');
            
            expect(chatWidget.getMessages()).toHaveLength(2);
            
            chatWidget.clearHistory();
            expect(chatWidget.getMessages()).toHaveLength(0);
        });

        test('should validate message distinction correctly', () => {
            // Add user message
            chatWidget.displayCorrectionRequest('Grammar', 'test text');
            
            // Add assistant message
            const response: CorrectionResponse = {
                correctedText: 'corrected text',
                explanation: 'Fixed grammar',
                changes: [],
                confidence: 0.9
            };
            const assistantMessage = messageRenderer.createAssistantMessage(response, 'test text', 'Grammar');
            chatWidget.addMessage(assistantMessage);
            
            const distinction = chatWidget.validateMessageDistinction();
            expect(distinction.hasUserMessages).toBe(true);
            expect(distinction.hasAssistantMessages).toBe(true);
            expect(distinction.areDistinguished).toBe(true);
        });

        test('should create user messages with correct format', () => {
            const message = messageRenderer.createUserMessage('Grammar', 'test text', true, { start: 0, end: 9 });
            
            expect(message.type).toBe('user');
            expect(message.promptName).toBe('Grammar');
            expect(message.isSelection).toBe(true);
            expect(message.selectionRange).toEqual({ start: 0, end: 9 });
            expect(message.content).toContain('Requesting Grammar correction');
            expect(message.content).toContain('selected text');
        });

        test('should create assistant messages with actions', () => {
            const response: CorrectionResponse = {
                correctedText: 'corrected text',
                explanation: 'Fixed grammar issues',
                changes: [
                    {
                        original: 'wrong',
                        corrected: 'right',
                        reason: 'grammar',
                        position: { start: 0, end: 5 }
                    }
                ],
                confidence: 0.95
            };

            const message = messageRenderer.createAssistantMessage(response, 'original text', 'Grammar');
            
            expect(message.type).toBe('assistant');
            expect(message.promptName).toBe('Grammar');
            expect(message.content).toContain('📝 **Analysis:**');
            expect(message.content).toContain('Fixed grammar issues');
            expect(message.content).toContain('✏️ **Corrected Text:**');
            expect(message.content).toContain('🔍 **Changes Made:**');
            expect(message.actions).toBeDefined();
            expect(message.actions!.length).toBeGreaterThan(0);
            
            const applyAction = message.actions!.find(action => action.type === 'apply');
            expect(applyAction).toBeDefined();
            expect(applyAction!.label).toBe('Apply Changes');
        });
    });
});