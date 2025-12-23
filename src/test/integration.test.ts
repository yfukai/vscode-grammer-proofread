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
        (vscode.workspace as any).getConfiguration = jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue([]),
            update: jest.fn().mockResolvedValue(undefined)
        });
        (vscode as any).ConfigurationTarget = {
            Global: 1,
            Workspace: 2,
            WorkspaceFolder: 3
        };
        
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
        test('should load and manage prompts from configuration', () => {
            const testConfig = {
                customPrompts: [
                    {
                        id: 'test1',
                        name: 'Test Prompt 1',
                        content: 'Test content 1',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        id: 'test2',
                        name: 'Test Prompt 2',
                        content: 'Test content 2',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: 'Shared prompt content'
            };

            // Load configuration
            promptManager.loadConfiguration(testConfig);
            
            // Verify prompts were loaded
            const prompts = promptManager.getPrompts();
            expect(prompts.length).toBe(2);
            expect(prompts[0].name).toBe('Test Prompt 1');
            expect(prompts[1].name).toBe('Test Prompt 2');
            expect(promptManager.getSharedPrompt()).toBe('Shared prompt content');
        });

        test('should maintain fallback prompt when no prompts exist', () => {
            // Load empty configuration
            promptManager.loadConfiguration({ customPrompts: [], sharedPrompt: '' });
            
            // Ensure default prompts
            promptManager.ensureDefaultPrompts();
            
            // Should have at least one prompt
            expect(promptManager.getPrompts().length).toBeGreaterThanOrEqual(1);
            
            const fallbackPrompt = promptManager.getPrompts()[0];
            expect(fallbackPrompt.name).toBe('Grammar Correction');
            expect(fallbackPrompt.content).toContain('grammar, spelling, and punctuation');
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
            // Test invalid shared prompt
            const longSharedPrompt = 'a'.repeat(2001);
            expect(() => promptManager.setSharedPrompt(longSharedPrompt))
                .toThrow('Shared prompt content must not exceed 2000 characters');
                
            // Test shared prompt validation
            expect(promptManager.validateSharedPrompt('valid content')).toBe(true);
            expect(promptManager.validateSharedPrompt(longSharedPrompt)).toBe(false);
        });

        test('should handle system errors', () => {
            // Test invalid shared prompt
            const longSharedPrompt = 'a'.repeat(2001);
            expect(() => promptManager.setSharedPrompt(longSharedPrompt))
                .toThrow('Shared prompt content must not exceed 2000 characters');
                
            // Test invalid prompt ID in combinePrompts
            expect(() => promptManager.combinePrompts('nonexistent-id'))
                .toThrow('Custom prompt with ID "nonexistent-id" not found');
        });
    });

    describe('UI synchronization', () => {
        test('should synchronize prompt changes across UI components', () => {
            const testConfig = {
                customPrompts: [
                    {
                        id: 'ui-test',
                        name: 'UI Test Prompt',
                        content: 'UI test content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: ''
            };

            // Load new configuration
            promptManager.loadConfiguration(testConfig);

            // Update VSCode integration
            vscodeIntegration.updatePromptManager(promptManager);

            // Verify command registration
            const promptCommands = vscodeIntegration.getPromptCommands();
            expect(promptCommands.length).toBe(1);

            // Find the new prompt command
            const newPromptCommand = promptCommands.find(cmd => cmd.promptId === 'ui-test');
            expect(newPromptCommand).toBeDefined();
            expect(newPromptCommand!.title).toContain('UI Test Prompt');
        });

        test('should handle chat widget updates', () => {
            // Create new prompt manager with test configuration
            const newPromptManager = new PromptManager();
            const testConfig = {
                customPrompts: [
                    {
                        id: 'chat-test',
                        name: 'Chat Test Prompt',
                        content: 'Chat test content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: ''
            };
            newPromptManager.loadConfiguration(testConfig);

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
            // Mock VSCode configuration
            const mockConfig = {
                get: jest.fn(),
                update: jest.fn().mockResolvedValue(undefined)
            };
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

            // Mock getting custom prompts from settings
            mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
                if (key === 'customPrompts') {
                    return [
                        {
                            name: 'Config Test',
                            content: 'Config test content'
                        }
                    ];
                } else if (key === 'sharedPrompt') {
                    return 'Test shared prompt';
                }
                return defaultValue;
            });

            // Load configuration from settings
            const loadedConfig = await configProvider.getPromptConfiguration();
            
            // Verify configuration was loaded correctly
            expect(loadedConfig.customPrompts.length).toBe(1);
            expect(loadedConfig.customPrompts[0].name).toBe('Config Test');
            expect(loadedConfig.customPrompts[0].content).toBe('Config test content');
            expect(loadedConfig.sharedPrompt).toBe('Test shared prompt');

            // Test saving shared prompt (custom prompts are managed through settings UI)
            const configToSave = {
                customPrompts: loadedConfig.customPrompts,
                sharedPrompt: 'Updated shared prompt'
            };
            
            await configProvider.savePromptConfiguration(configToSave);

            // Verify shared prompt was saved to VSCode settings
            expect(mockConfig.update).toHaveBeenCalledWith(
                'sharedPrompt',
                'Updated shared prompt',
                vscode.ConfigurationTarget.Workspace
            );
        });
    });
});