import * as fc from 'fast-check';
import { VSCodeIntegration } from '../VSCodeIntegration';
import { ChatWidget } from '../ChatWidget';
import { CorrectionService } from '../../services/CorrectionService';
import { PromptManager } from '../../services/PromptManager';
import { TaskManager } from '../../services/TaskManager';
import { LLMApiClient } from '../../services/LLMApiClient';
import { LLMApiConfiguration } from '../../types';

// Mock vscode module
jest.mock('vscode', () => ({
    commands: {
        registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        executeCommand: jest.fn()
    },
    window: {
        createStatusBarItem: jest.fn().mockReturnValue({
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        }),
        createOutputChannel: jest.fn().mockReturnValue({
            appendLine: jest.fn(),
            dispose: jest.fn()
        }),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showQuickPick: jest.fn(),
        withProgress: jest.fn(),
        activeTextEditor: undefined,
        onDidChangeTextEditorSelection: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        onDidChangeActiveTextEditor: jest.fn().mockReturnValue({ dispose: jest.fn() })
    },
    workspace: {
        onDidChangeConfiguration: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue('explorer')
        })
    },
    StatusBarAlignment: {
        Right: 2
    },
    ProgressLocation: {
        Notification: 15
    }
}));

import * as vscode from 'vscode';

describe('VSCodeIntegration', () => {
    let integration: VSCodeIntegration;
    let promptManager: PromptManager;
    let correctionService: CorrectionService;
    let chatWidget: ChatWidget;
    let mockExtensionUri: vscode.Uri;

    beforeEach(() => {
        // Reset all mocks
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
        
        integration = new VSCodeIntegration(correctionService, promptManager, chatWidget);
    });

    afterEach(() => {
        integration.dispose();
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 7: UI synchronization consistency**
     * **Validates: Requirements 7.3, 9.4**
     * 
     * For any change to custom prompts, all user interfaces (context menus, command palette, chat widget) 
     * should reflect the updated prompt list immediately
     */
    test('Property 7: UI synchronization consistency', () => {
        fc.assert(fc.property(
            fc.array(fc.record({
                operation: fc.constantFrom('create', 'update', 'delete'),
                name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                content: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0)
            }), { minLength: 1, maxLength: 20 }),
            (operations) => {
                // Reset to clean state
                const initialPromptManager = new PromptManager();
                initialPromptManager.ensureDefaultPrompts();
                
                // Reset command registration mock
                (vscode.commands.registerCommand as jest.Mock).mockClear();
                
                // Update integration with new prompt manager
                integration.updatePromptManager(initialPromptManager);
                
                // Get initial command count (should include default prompts + static commands)
                const initialCommandCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;
                const initialPrompts = initialPromptManager.getPrompts();
                
                // Property 1: Initial state should register commands for all prompts
                // Each prompt should have a corresponding command registered
                const promptCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls.filter(
                    call => call[0].startsWith('grammarProofreading.prompt.')
                );
                expect(promptCommandCalls.length).toBe(initialPrompts.length);
                
                let currentPrompts = [...initialPrompts];
                
                // Apply operations and verify UI synchronization
                for (const op of operations) {
                    const beforeOperationCommandCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;
                    
                    try {
                        switch (op.operation) {
                            case 'create':
                                // With settings-based configuration, we simulate adding a prompt
                                const existingNames = currentPrompts.map(p => p.name);
                                if (!existingNames.includes(op.name)) {
                                    const newPrompt = {
                                        id: `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                        name: op.name,
                                        content: op.content,
                                        createdAt: new Date(),
                                        updatedAt: new Date()
                                    };
                                    currentPrompts.push(newPrompt);
                                    
                                    // Update prompt manager with new configuration
                                    initialPromptManager.loadConfiguration({
                                        customPrompts: currentPrompts,
                                        sharedPrompt: ''
                                    });
                                    
                                    // Trigger UI refresh
                                    integration.refreshPromptCommands();
                                }
                                break;
                                
                            case 'update':
                                if (currentPrompts.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * currentPrompts.length);
                                    const promptToUpdate = currentPrompts[randomIndex];
                                    
                                    // Check if new name conflicts with other prompts
                                    const otherNames = currentPrompts
                                        .filter(p => p.id !== promptToUpdate.id)
                                        .map(p => p.name);
                                    
                                    if (!otherNames.includes(op.name)) {
                                        currentPrompts[randomIndex] = {
                                            ...promptToUpdate,
                                            name: op.name,
                                            content: op.content,
                                            updatedAt: new Date()
                                        };
                                        
                                        // Update prompt manager with new configuration
                                        initialPromptManager.loadConfiguration({
                                            customPrompts: currentPrompts,
                                            sharedPrompt: ''
                                        });
                                        
                                        // Trigger UI refresh
                                        integration.refreshPromptCommands();
                                    }
                                }
                                break;
                                
                            case 'delete':
                                if (currentPrompts.length > 1) { // Can't delete the last prompt
                                    const randomIndex = Math.floor(Math.random() * currentPrompts.length);
                                    currentPrompts.splice(randomIndex, 1);
                                    
                                    // Update prompt manager with new configuration
                                    initialPromptManager.loadConfiguration({
                                        customPrompts: currentPrompts,
                                        sharedPrompt: ''
                                    });
                                    
                                    // Trigger UI refresh
                                    integration.refreshPromptCommands();
                                }
                                break;
                        }
                    } catch (error) {
                        // Some operations may fail due to validation, which is expected
                    }
                    
                    // Property 2: After any operation, command registration should reflect current prompts
                    const afterOperationPrompts = initialPromptManager.getPrompts();
                    const currentPromptCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls.filter(
                        call => call[0].startsWith('grammarProofreading.prompt.')
                    );
                    
                    // The number of prompt commands should match the number of prompts
                    // Note: We may have multiple registrations due to refreshes, but the latest should be correct
                    expect(afterOperationPrompts.length).toBeGreaterThanOrEqual(1); // Minimum prompt invariant
                    
                    // Property 3: All current prompts should have corresponding commands
                    const promptCommands = integration.getPromptCommands();
                    expect(promptCommands.length).toBe(afterOperationPrompts.length);
                    
                    // Property 4: Each prompt should have a unique command ID
                    const commandIds = promptCommands.map(cmd => cmd.id);
                    const uniqueCommandIds = new Set(commandIds);
                    expect(uniqueCommandIds.size).toBe(commandIds.length);
                    
                    // Property 5: Command IDs should follow the expected pattern
                    for (const cmd of promptCommands) {
                        expect(cmd.id).toMatch(/^grammarProofreading\.prompt\..+$/);
                        expect(cmd.title).toContain('Correct with');
                        expect(cmd.promptId).toBeTruthy();
                    }
                    
                    // Property 6: All prompt IDs in commands should exist in current prompts
                    const currentPromptIds = new Set(afterOperationPrompts.map(p => p.id));
                    for (const cmd of promptCommands) {
                        expect(currentPromptIds.has(cmd.promptId)).toBe(true);
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific integration functionality
    describe('Command registration', () => {
        test('should register static commands', () => {
            // Verify that static commands are registered
            const staticCommands = [
                'grammarProofreading.openSettings',
                'grammarProofreading.refreshPrompts',
                'grammarProofreading.processFullDocument',
                'grammarProofreading.showChatWidget',
                'grammarProofreading.clearChatHistory'
            ];
            
            const registeredCommands = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(call => call[0]);
            
            for (const cmd of staticCommands) {
                expect(registeredCommands).toContain(cmd);
            }
        });

        test('should register prompt commands for all prompts', () => {
            const prompts = promptManager.getPrompts();
            const promptCommands = integration.getPromptCommands();
            
            expect(promptCommands.length).toBe(prompts.length);
            
            for (let i = 0; i < prompts.length; i++) {
                expect(promptCommands[i].promptId).toBe(prompts[i].id);
                expect(promptCommands[i].title).toContain(prompts[i].name);
            }
        });

        test('should refresh commands when prompts change', () => {
            const initialCallCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;
            
            // Create new configuration with additional prompt
            const testConfig = {
                customPrompts: [
                    ...promptManager.getPrompts(),
                    {
                        id: 'new-test-prompt',
                        name: 'New Test Prompt',
                        content: 'Test content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: ''
            };
            
            // Load new configuration
            promptManager.loadConfiguration(testConfig);
            
            // Refresh commands
            integration.refreshPromptCommands();
            
            // Should have registered new commands
            expect((vscode.commands.registerCommand as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
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
            expect(() => integration.updateCorrectionService(newCorrectionService)).not.toThrow();
        });

        test('should update prompt manager and refresh UI', () => {
            const newPromptManager = new PromptManager();
            const testConfig = {
                customPrompts: [
                    {
                        id: 'updated-prompt',
                        name: 'Updated Prompt',
                        content: 'Updated content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: ''
            };
            newPromptManager.loadConfiguration(testConfig);
            
            const initialCallCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;
            
            integration.updatePromptManager(newPromptManager);
            
            // Should have refreshed commands
            expect((vscode.commands.registerCommand as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
        });

        test('should update chat widget', () => {
            const newChatWidget = new ChatWidget(mockExtensionUri, correctionService, promptManager);
            
            // Should not throw
            expect(() => integration.updateChatWidget(newChatWidget)).not.toThrow();
        });
    });

    describe('Event listeners', () => {
        test('should register configuration change listener', () => {
            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        });

        test('should register selection change listener', () => {
            expect(vscode.window.onDidChangeTextEditorSelection).toHaveBeenCalled();
        });

        test('should register active editor change listener', () => {
            expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
        });
    });

    describe('Status bar management', () => {
        test('should create and show status bar item', () => {
            expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
            
            const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0].value;
            expect(statusBarItem.show).toHaveBeenCalled();
        });
    });

    describe('Output channel management', () => {
        test('should create output channel', () => {
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Grammar Proofreading');
        });
    });

    describe('Command ID generation', () => {
        test('should generate unique command IDs for prompts', () => {
            const prompts = promptManager.getPrompts();
            const commands = integration.getPromptCommands();
            
            // All command IDs should be unique
            const commandIds = commands.map(cmd => cmd.id);
            const uniqueIds = new Set(commandIds);
            expect(uniqueIds.size).toBe(commandIds.length);
            
            // All command IDs should follow the pattern
            for (const cmd of commands) {
                expect(cmd.id).toMatch(/^grammarProofreading\.prompt\..+$/);
            }
        });

        test('should map prompt IDs correctly to command IDs', () => {
            const prompts = promptManager.getPrompts();
            const commands = integration.getPromptCommands();
            
            for (let i = 0; i < prompts.length; i++) {
                const expectedCommandId = `grammarProofreading.prompt.${prompts[i].id}`;
                const actualCommand = commands.find(cmd => cmd.promptId === prompts[i].id);
                
                expect(actualCommand).toBeDefined();
                expect(actualCommand!.id).toBe(expectedCommandId);
            }
        });
    });

    describe('Chat Widget Integration', () => {
        test('should show chat widget when showChatWidget command is executed', async () => {
            // Find the showChatWidget command registration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();
            
            // Execute the command handler
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();
            
            // Verify it calls the focus command
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
        });

        test('should show chat widget when status bar item is clicked', async () => {
            // Find the showChatWidget command registration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();

            // Get the status bar item
            const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0].value;
            
            // Verify status bar item has the correct command
            expect(statusBarItem.command).toBe('grammarProofreading.showChatWidget');

            // Execute the command handler (simulating status bar click)
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();

            // Verify the focus command was called
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
        });

        test('should register showChatWidget command during initialization', () => {
            // Verify the command was registered
            const registeredCommands = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(call => call[0]);
            expect(registeredCommands).toContain('grammarProofreading.showChatWidget');
        });

        test('should update status bar tooltip to indicate chat widget functionality', () => {
            const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0].value;
            
            // Check initial state
            expect(statusBarItem.text).toBe('$(pencil) Grammar');
            expect(statusBarItem.tooltip).toBe('Click to show Grammar Proofreading Chat');
            expect(statusBarItem.command).toBe('grammarProofreading.showChatWidget');
        });

        test('should execute chat widget focus command when showChatWidget is called', async () => {
            // Find the showChatWidget command registration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();
            
            // Execute the command handler
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();
            
            // Verify it calls the focus command
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
        });

        test('should handle focus failure by showing appropriate view container', async () => {
            // Mock workspace configuration
            const mockConfig = {
                get: jest.fn().mockReturnValue('panel')
            };
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
            
            // Mock executeCommand to fail on first call (focus) and succeed on subsequent calls
            (vscode.commands.executeCommand as jest.Mock)
                .mockRejectedValueOnce(new Error('Focus failed'))
                .mockResolvedValue(undefined);
            
            // Find the showChatWidget command registration
            const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                call => call[0] === 'grammarProofreading.showChatWidget'
            );
            
            expect(showChatWidgetCall).toBeDefined();
            
            // Execute the command handler
            const commandHandler = showChatWidgetCall[1];
            await commandHandler();
            
            // Verify it tried to focus first
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('grammarProofreading.chatWidget.focus');
            
            // Verify it showed the panel container after focus failed
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.grammarProofreading.panel.focus');
        });

        test('should show correct view container for each position', async () => {
            const positions = [
                { position: 'explorer', command: 'workbench.view.explorer' },
                { position: 'scm', command: 'workbench.view.scm' },
                { position: 'debug', command: 'workbench.view.debug' },
                { position: 'extensions', command: 'workbench.view.extensions' },
                { position: 'panel', command: 'workbench.panel.grammarProofreading.panel.focus' }
            ];

            for (const { position, command } of positions) {
                // Mock workspace configuration for this position
                const mockConfig = {
                    get: jest.fn().mockReturnValue(position)
                };
                (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
                
                // Mock executeCommand to fail on first call (focus) and succeed on subsequent calls
                (vscode.commands.executeCommand as jest.Mock)
                    .mockRejectedValueOnce(new Error('Focus failed'))
                    .mockResolvedValue(undefined);
                
                // Find the showChatWidget command registration (should still exist from beforeEach)
                const showChatWidgetCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
                    call => call[0] === 'grammarProofreading.showChatWidget'
                );
                
                expect(showChatWidgetCall).toBeDefined();
                
                // Execute the command handler
                const commandHandler = showChatWidgetCall[1];
                await commandHandler();
                
                // Verify it showed the correct view container
                expect(vscode.commands.executeCommand).toHaveBeenCalledWith(command);
                
                // Reset executeCommand mock for next iteration
                (vscode.commands.executeCommand as jest.Mock).mockClear();
            }
        });
    });
});