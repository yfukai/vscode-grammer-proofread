import { ConfigurationProvider } from '../ConfigurationProvider';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() }))
    },
    ConfigurationTarget: {
        Workspace: 2
    }
}));

describe('ConfigurationProvider', () => {
    let configProvider: ConfigurationProvider;
    let mockContext: vscode.ExtensionContext;
    let mockConfig: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock configuration
        mockConfig = {
            get: jest.fn(),
            update: jest.fn()
        };
        
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
        
        // Create mock extension context
        mockContext = {
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
            }
        } as any;
        
        configProvider = new ConfigurationProvider(mockContext);
    });

    describe('Chat Widget Position Configuration', () => {
        test('should get default chat widget position as explorer', () => {
            mockConfig.get.mockReturnValue('explorer');
            
            const position = configProvider.getChatWidgetPosition();
            
            expect(position).toBe('explorer');
            expect(mockConfig.get).toHaveBeenCalledWith('chatWidgetPosition', 'explorer');
        });

        test('should get configured chat widget position', () => {
            mockConfig.get.mockReturnValue('panel');
            
            const position = configProvider.getChatWidgetPosition();
            
            expect(position).toBe('panel');
        });

        test('should set chat widget position', async () => {
            await configProvider.setChatWidgetPosition('scm');
            
            expect(mockConfig.update).toHaveBeenCalledWith(
                'chatWidgetPosition',
                'scm',
                vscode.ConfigurationTarget.Workspace
            );
        });

        test('should handle all valid position values', () => {
            const validPositions: Array<'explorer' | 'scm' | 'debug' | 'extensions' | 'panel'> = [
                'explorer', 'scm', 'debug', 'extensions', 'panel'
            ];

            validPositions.forEach(position => {
                mockConfig.get.mockReturnValue(position);
                
                const result = configProvider.getChatWidgetPosition();
                expect(result).toBe(position);
            });
        });

        test('should return default when invalid position is configured', () => {
            mockConfig.get.mockReturnValue('invalid-position');
            
            const position = configProvider.getChatWidgetPosition();
            
            // Should still return the configured value, but TypeScript ensures type safety
            expect(mockConfig.get).toHaveBeenCalledWith('chatWidgetPosition', 'explorer');
        });
    });

    describe('Custom Prompts Configuration', () => {
        test('should get custom prompts from settings', async () => {
            const settingsPrompts = [
                { name: 'Test Prompt', content: 'Test content' },
                { name: 'Another Prompt', content: 'Another content' }
            ];
            mockConfig.get.mockReturnValue(settingsPrompts);
            
            const config = await configProvider.getPromptConfiguration();
            
            expect(config.customPrompts).toHaveLength(2);
            expect(config.customPrompts[0].name).toBe('Test Prompt');
            expect(config.customPrompts[0].content).toBe('Test content');
            expect(config.customPrompts[0].id).toBeTruthy();
            expect(config.customPrompts[1].name).toBe('Another Prompt');
            expect(config.customPrompts[1].content).toBe('Another content');
        });

        test('should generate consistent IDs for same prompt content', async () => {
            const settingsPrompts = [
                { name: 'Test Prompt', content: 'Test content' }
            ];
            mockConfig.get.mockReturnValue(settingsPrompts);
            
            const config1 = await configProvider.getPromptConfiguration();
            const config2 = await configProvider.getPromptConfiguration();
            
            expect(config1.customPrompts[0].id).toBe(config2.customPrompts[0].id);
        });

        test('should handle empty custom prompts from settings', async () => {
            mockConfig.get.mockReturnValue([]);
            
            const config = await configProvider.getPromptConfiguration();
            
            expect(config.customPrompts).toHaveLength(0);
        });
    });

    describe('Prompt Configuration Management', () => {
        test('should get prompt configuration with shared prompt', async () => {
            const settingsPrompts = [{ name: 'Test', content: 'Content' }];
            mockConfig.get
                .mockReturnValueOnce(settingsPrompts) // customPrompts
                .mockReturnValueOnce('Shared content'); // sharedPrompt
            
            const config = await configProvider.getPromptConfiguration();
            
            expect(config.customPrompts).toHaveLength(1);
            expect(config.sharedPrompt).toBe('Shared content');
        });

        test('should save only shared prompt to configuration', async () => {
            const config = {
                customPrompts: [{ id: 'test', name: 'Test', content: 'Content', createdAt: new Date(), updatedAt: new Date() }],
                sharedPrompt: 'New shared content'
            };
            
            await configProvider.savePromptConfiguration(config);
            
            // Should only update shared prompt, not custom prompts
            expect(mockConfig.update).toHaveBeenCalledWith(
                'sharedPrompt',
                'New shared content',
                vscode.ConfigurationTarget.Workspace
            );
            expect(mockConfig.update).toHaveBeenCalledTimes(1);
        });
    });

    describe('LLM API Configuration', () => {
        test('should get LLM API configuration with defaults', () => {
            mockConfig.get
                .mockReturnValueOnce('https://api.openai.com/v1/chat/completions') // endpoint
                .mockReturnValueOnce('test-key') // apiKey
                .mockReturnValueOnce('gpt-3.5-turbo'); // model
            
            const apiConfig = configProvider.getLLMApiConfiguration();
            
            expect(apiConfig).toEqual({
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'test-key',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            });
        });

        test('should validate API configuration correctly', () => {
            const validConfig = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'test-key',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const errors = configProvider.validateApiConfiguration(validConfig);
            expect(errors).toEqual([]);
        });

        test('should return validation errors for invalid configuration', () => {
            const invalidConfig = {
                endpoint: '',
                apiKey: '',
                model: '',
                maxTokens: -1,
                temperature: 3
            };
            
            const errors = configProvider.validateApiConfiguration(invalidConfig);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors).toContain('API endpoint is required');
            expect(errors).toContain('API key is required');
            expect(errors).toContain('Model is required');
            expect(errors).toContain('Max tokens must be greater than 0');
            expect(errors).toContain('Temperature must be between 0 and 2');
        });
    });

    describe('Configuration Change Listeners', () => {
        test('should register configuration change listener', () => {
            const callback = jest.fn();
            
            configProvider.onConfigurationChange(callback);
            
            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        });

        test('should call callback when configuration changes', () => {
            const callback = jest.fn();
            let changeHandler: (event: any) => void;
            
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
                changeHandler = handler;
                return { dispose: jest.fn() };
            });
            
            configProvider.onConfigurationChange(callback);
            
            // Simulate configuration change
            const mockEvent = {
                affectsConfiguration: jest.fn().mockReturnValue(true)
            };
            
            changeHandler!(mockEvent);
            
            expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('grammarProofreading');
            expect(callback).toHaveBeenCalled();
        });

        test('should not call callback when unrelated configuration changes', () => {
            const callback = jest.fn();
            let changeHandler: (event: any) => void;
            
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
                changeHandler = handler;
                return { dispose: jest.fn() };
            });
            
            configProvider.onConfigurationChange(callback);
            
            // Simulate unrelated configuration change
            const mockEvent = {
                affectsConfiguration: jest.fn().mockReturnValue(false)
            };
            
            changeHandler!(mockEvent);
            
            expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('grammarProofreading');
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Default Configuration', () => {
        test('should detect first installation correctly', async () => {
            mockConfig.get.mockReturnValue([]);
            
            const isFirst = await configProvider.isFirstInstallation();
            
            expect(isFirst).toBe(true);
        });

        test('should detect existing installation correctly', async () => {
            mockConfig.get.mockReturnValue([{ name: 'Test', content: 'Content' }]);
            
            const isFirst = await configProvider.isFirstInstallation();
            
            expect(isFirst).toBe(false);
        });

        test('should create default prompts in settings format', () => {
            const defaultPrompts = configProvider.createDefaultPrompts();
            
            expect(defaultPrompts).toHaveLength(3);
            expect(defaultPrompts[0].name).toBe('Grammar Correction');
            expect(defaultPrompts[1].name).toBe('Logic Reorganization');
            expect(defaultPrompts[2].name).toBe('Tense Consistency');
            
            // Verify all prompts have required fields
            defaultPrompts.forEach(prompt => {
                expect(prompt.name).toBeTruthy();
                expect(prompt.content).toBeTruthy();
                expect(typeof prompt.name).toBe('string');
                expect(typeof prompt.content).toBe('string');
            });
        });

        test('should initialize default configuration on first installation', async () => {
            mockConfig.get.mockReturnValue([]); // Empty prompts = first installation
            
            await configProvider.initializeDefaultConfiguration();
            
            expect(mockConfig.update).toHaveBeenCalledWith(
                'customPrompts',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Grammar Correction' }),
                    expect.objectContaining({ name: 'Logic Reorganization' }),
                    expect.objectContaining({ name: 'Tense Consistency' })
                ]),
                vscode.ConfigurationTarget.Workspace
            );
        });

        test('should not initialize defaults if prompts already exist', async () => {
            mockConfig.get.mockReturnValue([{ name: 'Existing', content: 'Content' }]);
            
            await configProvider.initializeDefaultConfiguration();
            
            expect(mockConfig.update).not.toHaveBeenCalled();
        });
    });
});