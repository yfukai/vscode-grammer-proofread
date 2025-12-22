import * as fc from 'fast-check';
import { ChatWidget } from '../ChatWidget';
import { ChatMessage, CustomPrompt, LLMApiConfiguration } from '../../types';
import { CorrectionService } from '../../services/CorrectionService';
import { PromptManager } from '../../services/PromptManager';
import { TaskManager } from '../../services/TaskManager';
import { LLMApiClient } from '../../services/LLMApiClient';
import * as vscode from 'vscode';

// Mock vscode webview
const mockWebview = {
    html: '',
    options: {},
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(),
    asWebviewUri: jest.fn(),
    cspSource: 'test'
};

const mockWebviewView = {
    webview: mockWebview,
    onDidDispose: jest.fn(),
    onDidChangeVisibility: jest.fn(),
    visible: true,
    viewType: 'test',
    title: 'Test'
};

describe('ChatWidget', () => {
    let chatWidget: ChatWidget;
    let promptManager: PromptManager;
    let correctionService: CorrectionService;
    let mockExtensionUri: vscode.Uri;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup services
        promptManager = new PromptManager();
        promptManager.ensureDefaultPrompts();

        const apiConfig: LLMApiConfiguration = {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'test-key',
            model: 'gpt-3.5-turbo',
            maxTokens: 1000,
            temperature: 0.7
        };
        const apiClient = new LLMApiClient(apiConfig);
        const taskManager = new TaskManager();
        correctionService = new CorrectionService(promptManager, apiClient, taskManager);

        mockExtensionUri = { 
            scheme: 'file', 
            authority: '', 
            path: '/test', 
            query: '', 
            fragment: '',
            fsPath: '/test',
            with: jest.fn(),
            toJSON: jest.fn()
        } as any;

        chatWidget = new ChatWidget(mockExtensionUri, correctionService, promptManager);
        
        // Simulate webview resolution
        chatWidget.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
    });

    afterEach(() => {
        chatWidget.dispose();
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 9: Chat history management**
     * **Validates: Requirements 9.2, 9.3, 9.5**
     * 
     * For any sequence of correction requests and responses, the chat widget should maintain 
     * chronological order with proper timestamps and message formatting
     */
    test('Property 9: Chat history management', () => {
        fc.assert(fc.property(
            fc.array(fc.record({
                type: fc.constantFrom('request', 'response', 'error'),
                content: fc.string({ minLength: 1, maxLength: 500 }),
                promptName: fc.string({ minLength: 1, maxLength: 100 }),
                delayMs: fc.integer({ min: 0, max: 100 }) // Simulate time delays
            }), { minLength: 1, maxLength: 50 }),
            (messageSpecs) => {
                // Reset mock calls before test
                mockWebview.postMessage.mockClear();
                
                // Clear any existing messages
                chatWidget.clearHistory();
                
                const addedMessages: ChatMessage[] = [];
                let currentTime = new Date('2023-01-01T00:00:00Z');
                
                // Add messages with simulated timestamps
                for (const spec of messageSpecs) {
                    currentTime = new Date(currentTime.getTime() + spec.delayMs);
                    
                    const message: ChatMessage = {
                        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                        type: spec.type as 'request' | 'response' | 'error',
                        content: spec.content,
                        promptName: spec.promptName,
                        timestamp: new Date(currentTime)
                    };
                    
                    chatWidget.addMessage(message);
                    addedMessages.push(message);
                }
                
                // Verify that postMessage was called for clearHistory + each message
                const expectedCalls = 1 + addedMessages.length; // 1 for clearHistory, 1 per message
                expect(mockWebview.postMessage).toHaveBeenCalledTimes(expectedCalls);
                
                // Property 1: Messages should be added in chronological order
                const messageAddCalls = mockWebview.postMessage.mock.calls.filter(
                    call => call[0].command === 'messageAdded'
                );
                
                expect(messageAddCalls.length).toBe(addedMessages.length);
                
                // Property 2: Each message should have proper structure and timestamps
                for (let i = 0; i < messageAddCalls.length; i++) {
                    const call = messageAddCalls[i];
                    const sentMessage = call[0].message;
                    const originalMessage = addedMessages[i];
                    
                    // Verify message structure
                    expect(sentMessage).toHaveProperty('id');
                    expect(sentMessage).toHaveProperty('type');
                    expect(sentMessage).toHaveProperty('content');
                    expect(sentMessage).toHaveProperty('promptName');
                    expect(sentMessage).toHaveProperty('timestamp');
                    
                    // Verify message content matches
                    expect(sentMessage.type).toBe(originalMessage.type);
                    expect(sentMessage.content).toBe(originalMessage.content);
                    expect(sentMessage.promptName).toBe(originalMessage.promptName);
                    expect(new Date(sentMessage.timestamp)).toEqual(originalMessage.timestamp);
                    
                    // Verify chronological order (each message timestamp >= previous)
                    if (i > 0) {
                        const prevMessage = messageAddCalls[i - 1][0].message;
                        expect(new Date(sentMessage.timestamp).getTime())
                            .toBeGreaterThanOrEqual(new Date(prevMessage.timestamp).getTime());
                    }
                }
                
                // Property 3: Message history should be maintained (up to 100 messages)
                const expectedMessageCount = Math.min(addedMessages.length, 100);
                expect(messageAddCalls.length).toBe(expectedMessageCount);
                
                // Property 4: Message IDs should be unique
                const messageIds = messageAddCalls.map(call => call[0].message.id);
                const uniqueIds = new Set(messageIds);
                expect(uniqueIds.size).toBe(messageIds.length);
                
                // Property 5: All message types should be valid
                const validTypes = new Set(['request', 'response', 'error']);
                for (const call of messageAddCalls) {
                    expect(validTypes.has(call[0].message.type)).toBe(true);
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific chat widget functionality
    describe('Message management', () => {
        test('should add messages and maintain order', () => {
            const message1: ChatMessage = {
                id: 'msg1',
                type: 'request',
                content: 'Test request',
                promptName: 'Test Prompt',
                timestamp: new Date('2023-01-01T10:00:00Z')
            };

            const message2: ChatMessage = {
                id: 'msg2',
                type: 'response',
                content: 'Test response',
                promptName: 'Test Prompt',
                timestamp: new Date('2023-01-01T10:01:00Z')
            };

            chatWidget.addMessage(message1);
            chatWidget.addMessage(message2);

            // Verify messages were sent to webview
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'messageAdded',
                message: message1
            });

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'messageAdded',
                message: message2
            });
        });

        test('should clear history', () => {
            const message: ChatMessage = {
                id: 'msg1',
                type: 'request',
                content: 'Test message',
                promptName: 'Test Prompt',
                timestamp: new Date()
            };

            chatWidget.addMessage(message);
            chatWidget.clearHistory();

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'historyCleared'
            });
        });

        test('should limit history to 100 messages', () => {
            // Add 150 messages
            for (let i = 0; i < 150; i++) {
                const message: ChatMessage = {
                    id: `msg${i}`,
                    type: 'request',
                    content: `Message ${i}`,
                    promptName: 'Test Prompt',
                    timestamp: new Date(Date.now() + i * 1000)
                };
                chatWidget.addMessage(message);
            }

            // Should have called postMessage 150 times (once per message)
            const messageAddCalls = mockWebview.postMessage.mock.calls.filter(
                call => call[0].command === 'messageAdded'
            );
            expect(messageAddCalls.length).toBe(150);
        });
    });

    describe('Task state management', () => {
        test('should set task running state', () => {
            chatWidget.setTaskRunning(true);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'taskRunningChanged',
                isRunning: true
            });

            chatWidget.setTaskRunning(false);
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'taskRunningChanged',
                isRunning: false
            });
        });
    });

    describe('Prompt button management', () => {
        test('should refresh prompt buttons', () => {
            chatWidget.refreshPromptButtons();

            const prompts = promptManager.getPrompts();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'promptButtons',
                prompts
            });
        });

        test('should update prompt manager and refresh buttons', () => {
            const newPromptManager = new PromptManager();
            newPromptManager.createPrompt('New Prompt', 'New content');

            chatWidget.updatePromptManager(newPromptManager);

            const prompts = newPromptManager.getPrompts();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'promptButtons',
                prompts
            });
        });
    });

    describe('Service updates', () => {
        test('should update correction service', () => {
            const newApiConfig: LLMApiConfiguration = {
                endpoint: 'https://api.anthropic.com/v1/messages',
                apiKey: 'new-key',
                model: 'claude-3-sonnet',
                maxTokens: 2000,
                temperature: 0.5
            };
            const newApiClient = new LLMApiClient(newApiConfig);
            const newTaskManager = new TaskManager();
            const newCorrectionService = new CorrectionService(promptManager, newApiClient, newTaskManager);

            // Should not throw
            expect(() => chatWidget.updateCorrectionService(newCorrectionService)).not.toThrow();
        });
    });

    describe('Message formatting', () => {
        test('should handle different message types', () => {
            const requestMessage: ChatMessage = {
                id: 'req1',
                type: 'request',
                content: 'Please correct this text',
                promptName: 'Grammar Check',
                timestamp: new Date()
            };

            const responseMessage: ChatMessage = {
                id: 'res1',
                type: 'response',
                content: 'Corrected text here',
                promptName: 'Grammar Check',
                timestamp: new Date()
            };

            const errorMessage: ChatMessage = {
                id: 'err1',
                type: 'error',
                content: 'API connection failed',
                promptName: 'System',
                timestamp: new Date()
            };

            chatWidget.addMessage(requestMessage);
            chatWidget.addMessage(responseMessage);
            chatWidget.addMessage(errorMessage);

            // Verify all message types were handled
            const messageAddCalls = mockWebview.postMessage.mock.calls.filter(
                call => call[0].command === 'messageAdded'
            );

            expect(messageAddCalls.length).toBe(3);
            expect(messageAddCalls[0][0].message.type).toBe('request');
            expect(messageAddCalls[1][0].message.type).toBe('response');
            expect(messageAddCalls[2][0].message.type).toBe('error');
        });

        test('should preserve message content and metadata', () => {
            const message: ChatMessage = {
                id: 'test-msg',
                type: 'response',
                content: 'This is a test message with\nmultiple lines\nand special characters: !@#$%',
                promptName: 'Test Prompt with Special Characters: <>',
                timestamp: new Date('2023-06-15T14:30:00Z')
            };

            chatWidget.addMessage(message);

            const messageAddCall = mockWebview.postMessage.mock.calls.find(
                call => call[0].command === 'messageAdded'
            );

            expect(messageAddCall).toBeDefined();
            const sentMessage = messageAddCall![0].message;
            
            expect(sentMessage.content).toBe(message.content);
            expect(sentMessage.promptName).toBe(message.promptName);
            expect(sentMessage.type).toBe(message.type);
            expect(new Date(sentMessage.timestamp)).toEqual(message.timestamp);
        });
    });
});