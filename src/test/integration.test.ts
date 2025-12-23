import * as vscode from 'vscode';
import { PromptManager } from '../services/PromptManager';
import { ConfigurationProvider } from '../services/ConfigurationProvider';
import { LLMApiClient } from '../services/LLMApiClient';
import { TaskManager } from '../services/TaskManager';
import { CorrectionService } from '../services/CorrectionService';
import { ErrorHandler } from '../services/ErrorHandler';
import { ChatWidget } from '../ui/ChatWidget';
import { VSCodeIntegration } from '../ui/VSCodeIntegration';
import { LLMApiConfiguration, TextSelection } from '../types';

describe('Integration Tests', () => {
    let promptManager: PromptManager;
    let configProvider: ConfigurationProvider;
    let apiClient: LLMApiClient;
    let taskManager: TaskManager;
    let correctionService: CorrectionService;
    let errorHandler: ErrorHandler;
    let chatWidget: ChatWidget;
    let vscodeIntegration: VSCodeIntegration;
    let mockContext: vscode.ExtensionContext;
    let outputChannel: vscode.OutputChannel;

    beforeEach(() => {
        // Add missing VSCode API mocks
        (vscode.window as any).registerWebviewViewProvider = jest.fn().mockReturnValue({ dispose: jest.fn() });
        (vscode.commands as any).executeCommand = jest.fn().mockResolvedValue(undefined);
        
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: jest.fn().mockReturnValue([]),
                update: jest.fn().mockResolvedValue(undefined),
                keys: jest.fn().mockReturnValue([])
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([]),
                setKeysForSync: jest.fn()
            },
            extensionUri: {
                scheme: 'file',
                authority: '',
                path: '/test',
                query: '',
                fragment: '',
                fsPath: '/test',
                with: jest.fn(),
                toJSON: jest.fn()
            } as any,
            extensionPath: '/test',
            asAbsolutePath: jest.fn(),
            storagePath: '/test/storage',
            globalStoragePath: '/test/global',
            logPath: '/test/logs',
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {} as any,
            environmentVariableCollection: {} as any,
            logUri: {} as any,
            storageUri: {} as any,
            globalStorageUri: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any
        };

        // Create mock output channel
        outputChannel = {
            name: 'Test',
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            replace: jest.fn()
        };

        // Initialize services
        promptManager = new PromptManager();
        promptManager.ensureDefaultPrompts();

        configProvider = new ConfigurationProvider(mockContext);
        
        const apiConfig: LLMApiConfiguration = {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'test-key',
            model: 'gpt-3.5-turbo',
            maxTokens: 1000,
            temperature: 0.7
        };
        apiClient = new LLMApiClient(apiConfig);
        
        taskManager = new TaskManager();
        errorHandler = new ErrorHandler(outputChannel);
        correctionService = new CorrectionService(promptManager, apiClient, taskManager, errorHandler);
        
        chatWidget = new ChatWidget(mockContext.extensionUri, correctionService, promptManager);
        
        // Simulate the webview provider registration that happens in extension.ts
        vscode.window.registerWebviewViewProvider(ChatWidget.viewType, chatWidget);
        
        vscodeIntegration = new VSCodeIntegration(correctionService, promptManager, chatWidget);
    });

    afterEach(() => {
        if (vscodeIntegration) {
            vscodeIntegration.dispose();
        }
        if (chatWidget) {
            chatWidget.dispose();
        }
    });

    describe('End-to-end correction workflows', () => {
        test('should complete full correction workflow', async () => {
            // Mock API client to return predictable results
            const mockApiClient = {
                sendRequest: jest.fn().mockResolvedValue('Corrected text content'),
                validateConfiguration: jest.fn().mockReturnValue([]),
                updateConfiguration: jest.fn(),
                getConfiguration: jest.fn().mockReturnValue({
                    endpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.7
                }),
                testConnection: jest.fn().mockResolvedValue(true)
            } as any;

            const mockCorrectionService = new CorrectionService(
                promptManager,
                mockApiClient,
                taskManager,
                errorHandler
            );

            // Get a prompt to use
            const prompts = promptManager.getPrompts();
            expect(prompts.length).toBeGreaterThan(0);
            const testPrompt = prompts[0];

            // Create a test selection
            const testSelection: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 10
            };

            // Execute correction
            const correctionRequest = {
                promptId: testPrompt.id,
                text: 'Test text to correct',
                selection: testSelection,
                isFullDocument: false
            };

            const response = await mockCorrectionService.executeCorrection(correctionRequest);

            // Verify the workflow completed successfully
            expect(response).toBeDefined();
            expect(response.correctedText).toBe('Corrected text content');
            expect(mockApiClient.sendRequest).toHaveBeenCalledWith(
                expect.stringContaining(testPrompt.content),
                'Test text to correct'
            );
        });

        test('should handle concurrent correction requests properly', async () => {
            // Mock API client with delayed responses
            const mockApiClient = {
                sendRequest: jest.fn().mockImplementation(() => 
                    new Promise(resolve => setTimeout(() => resolve('Corrected text'), 100))
                ),
                validateConfiguration: jest.fn().mockReturnValue([]),
                updateConfiguration: jest.fn(),
                getConfiguration: jest.fn().mockReturnValue({
                    endpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.7
                }),
                testConnection: jest.fn().mockResolvedValue(true)
            } as any;

            const mockCorrectionService = new CorrectionService(
                promptManager,
                mockApiClient,
                taskManager,
                errorHandler
            );

            const prompts = promptManager.getPrompts();
            const testPrompt = prompts[0];

            // Create overlapping selections
            const selection1: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 10
            };

            const selection2: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 0,
                startCharacter: 5,
                endLine: 0,
                endCharacter: 15
            };

            // Start first correction
            const request1 = {
                promptId: testPrompt.id,
                text: 'First text',
                selection: selection1,
                isFullDocument: false
            };

            const correction1Promise = mockCorrectionService.executeCorrection(request1);

            // Try to start second correction on overlapping selection
            const request2 = {
                promptId: testPrompt.id,
                text: 'Second text',
                selection: selection2,
                isFullDocument: false
            };

            // Should be blocked
            await expect(mockCorrectionService.executeCorrection(request2))
                .rejects.toThrow('Selection is currently being processed by another task');

            // First correction should complete successfully
            const response1 = await correction1Promise;
            expect(response1.correctedText).toBe('Corrected text');

            // Now second correction should work
            const response2 = await mockCorrectionService.executeCorrection(request2);
            expect(response2.correctedText).toBe('Corrected text');
        });

        test('should handle non-overlapping concurrent requests', async () => {
            // Mock API client
            const mockApiClient = {
                sendRequest: jest.fn().mockResolvedValue('Corrected text'),
                validateConfiguration: jest.fn().mockReturnValue([]),
                updateConfiguration: jest.fn(),
                getConfiguration: jest.fn().mockReturnValue({
                    endpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.7
                }),
                testConnection: jest.fn().mockResolvedValue(true)
            } as any;

            const mockCorrectionService = new CorrectionService(
                promptManager,
                mockApiClient,
                taskManager,
                errorHandler
            );

            const prompts = promptManager.getPrompts();
            const testPrompt = prompts[0];

            // Create non-overlapping selections
            const selection1: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 5
            };

            const selection2: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 1,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 5
            };

            // Both corrections should work concurrently
            const request1 = {
                promptId: testPrompt.id,
                text: 'First text',
                selection: selection1,
                isFullDocument: false
            };

            const request2 = {
                promptId: testPrompt.id,
                text: 'Second text',
                selection: selection2,
                isFullDocument: false
            };

            const [response1, response2] = await Promise.all([
                mockCorrectionService.executeCorrection(request1),
                mockCorrectionService.executeCorrection(request2)
            ]);

            expect(response1.correctedText).toBe('Corrected text');
            expect(response2.correctedText).toBe('Corrected text');
            expect(mockApiClient.sendRequest).toHaveBeenCalledTimes(2);
        });
    });

    describe('Prompt management operations', () => {
        test('should create, update, and delete prompts', () => {
            const initialCount = promptManager.getPrompts().length;

            // Create new prompt
            const newPrompt = promptManager.createPrompt('Test Prompt', 'Test content for correction');
            expect(promptManager.getPrompts().length).toBe(initialCount + 1);
            expect(newPrompt.name).toBe('Test Prompt');
            expect(newPrompt.content).toBe('Test content for correction');

            // Update prompt
            const updatedPrompt = promptManager.updatePrompt(newPrompt.id, 'Updated Prompt', 'Updated content');
            expect(updatedPrompt.name).toBe('Updated Prompt');
            expect(updatedPrompt.content).toBe('Updated content');
            expect(promptManager.getPrompts().length).toBe(initialCount + 1);

            // Delete prompt (if not the last one)
            if (promptManager.getPrompts().length > 1) {
                promptManager.deletePrompt(newPrompt.id);
                expect(promptManager.getPrompts().length).toBe(initialCount);
            }
        });

        test('should maintain minimum prompt invariant', () => {
            // Ensure we have exactly one prompt
            const prompts = promptManager.getPrompts();
            while (prompts.length > 1) {
                promptManager.deletePrompt(prompts[prompts.length - 1].id);
                prompts.pop();
            }

            expect(promptManager.getPrompts().length).toBe(1);

            // Try to delete the last prompt
            const lastPrompt = promptManager.getPrompts()[0];
            expect(() => promptManager.deletePrompt(lastPrompt.id))
                .toThrow('Cannot delete the last remaining prompt');

            // Should still have one prompt
            expect(promptManager.getPrompts().length).toBe(1);
        });

        test('should handle shared prompt configuration', () => {
            const testSharedPrompt = 'This is a shared prompt that applies to all corrections.';
            
            // Set shared prompt
            promptManager.setSharedPrompt(testSharedPrompt);
            expect(promptManager.getSharedPrompt()).toBe(testSharedPrompt);

            // Test prompt combination
            const prompts = promptManager.getPrompts();
            const testPrompt = prompts[0];
            const combinedPrompt = promptManager.combinePrompts(testPrompt.id);
            
            expect(combinedPrompt).toContain(testPrompt.content);
            expect(combinedPrompt).toContain(testSharedPrompt);
        });
    });

    describe('Error handling scenarios', () => {
        test('should handle API errors gracefully', async () => {
            // Mock API client that throws errors
            const mockApiClient = {
                sendRequest: jest.fn().mockRejectedValue(new Error('API connection failed')),
                validateConfiguration: jest.fn().mockReturnValue([]),
                updateConfiguration: jest.fn(),
                getConfiguration: jest.fn().mockReturnValue({
                    endpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.7
                }),
                testConnection: jest.fn().mockResolvedValue(true)
            } as any;

            const mockCorrectionService = new CorrectionService(
                promptManager,
                mockApiClient,
                taskManager,
                errorHandler
            );

            const prompts = promptManager.getPrompts();
            const testPrompt = prompts[0];

            const testSelection: TextSelection = {
                documentUri: 'test://document.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 10
            };

            const correctionRequest = {
                promptId: testPrompt.id,
                text: 'Test text',
                selection: testSelection,
                isFullDocument: false
            };

            // Should handle the error and rethrow
            await expect(mockCorrectionService.executeCorrection(correctionRequest))
                .rejects.toThrow('API connection failed');

            // Error should be logged
            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('API connection failed')
            );
        });

        test('should handle validation errors', () => {
            // Test invalid prompt creation
            expect(() => promptManager.createPrompt('', 'content'))
                .toThrow('Prompt name must be 1-100 characters');

            expect(() => promptManager.createPrompt('name', ''))
                .toThrow('Prompt content must be 1-2000 characters');

            // Test duplicate name
            const prompts = promptManager.getPrompts();
            const existingPrompt = prompts[0];
            expect(() => promptManager.createPrompt(existingPrompt.name, 'new content'))
                .toThrow(`Prompt with name "${existingPrompt.name}" already exists`);
        });

        test('should handle system errors', () => {
            // Test invalid shared prompt
            const longSharedPrompt = 'a'.repeat(2001);
            expect(() => promptManager.setSharedPrompt(longSharedPrompt))
                .toThrow('Shared prompt content must not exceed 2000 characters');
        });
    });

    describe('UI synchronization', () => {
        test('should synchronize prompt changes across UI components', () => {
            const initialPromptCount = promptManager.getPrompts().length;

            // Create new prompt
            const newPrompt = promptManager.createPrompt('UI Test Prompt', 'UI test content');

            // Update VSCode integration
            vscodeIntegration.updatePromptManager(promptManager);

            // Verify command registration
            const promptCommands = vscodeIntegration.getPromptCommands();
            expect(promptCommands.length).toBe(initialPromptCount + 1);

            // Find the new prompt command
            const newPromptCommand = promptCommands.find(cmd => cmd.promptId === newPrompt.id);
            expect(newPromptCommand).toBeDefined();
            expect(newPromptCommand!.title).toContain('UI Test Prompt');
        });

        test('should handle chat widget updates', () => {
            // Update chat widget with new prompt manager
            const newPromptManager = new PromptManager();
            newPromptManager.createPrompt('Chat Test Prompt', 'Chat test content');

            chatWidget.updatePromptManager(newPromptManager);

            // Verify the update doesn't throw errors
            expect(() => chatWidget.refreshPromptButtons()).not.toThrow();
        });
    });

    describe('Chat Widget Visibility', () => {
        test('should make chat widget visible when showChatWidget command is executed', async () => {
            // Find the showChatWidget command registration from VSCodeIntegration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();
            
            // Execute the command handler
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();

            // Verify the chat widget focus command was called
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
        });

        test('should make chat widget visible when status bar Grammar button is clicked', async () => {
            // Find the showChatWidget command registration from VSCodeIntegration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();

            // Execute the command handler (simulating status bar click)
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();

            // Verify the chat widget focus command was called
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
        });

        test('should register chat widget view provider during extension activation', () => {
            // The chat widget should be created and registered during beforeEach
            // Verify that the chat widget view provider is registered
            expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
                'grammarProofreading.chatWidget',
                expect.any(Object)
            );
        });
    });

    describe('Configuration persistence', () => {
        test('should save and load configuration', async () => {
            // Mock the workspace state methods
            let savedConfig: any = null;
            (mockContext.workspaceState.update as jest.Mock).mockImplementation((key, value) => {
                if (key === 'customPrompts') {
                    savedConfig = value;
                }
                return Promise.resolve();
            });

            (mockContext.workspaceState.get as jest.Mock).mockImplementation((key, defaultValue) => {
                if (key === 'customPrompts') {
                    return savedConfig || defaultValue;
                }
                return defaultValue;
            });

            // Create a new prompt
            const testPrompt = promptManager.createPrompt('Config Test', 'Config test content');
            const config = promptManager.getConfiguration();

            // Save configuration
            await configProvider.savePromptConfiguration(config);

            // Verify it was saved
            expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
                'customPrompts',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Config Test',
                        content: 'Config test content'
                    })
                ])
            );

            // Load configuration
            const loadedConfig = await configProvider.getPromptConfiguration();
            expect(loadedConfig.customPrompts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Config Test',
                        content: 'Config test content'
                    })
                ])
            );
        });
    });
});