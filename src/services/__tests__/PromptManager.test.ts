import { PromptManager } from '../PromptManager';
import { CustomPrompt, PromptConfiguration } from '../../types';

describe('PromptManager', () => {
    let promptManager: PromptManager;

    beforeEach(() => {
        promptManager = new PromptManager();
    });

    describe('Configuration Management', () => {
        test('should load configuration correctly', () => {
            const config: PromptConfiguration = {
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
                sharedPrompt: 'Shared content'
            };

            promptManager.loadConfiguration(config);

            expect(promptManager.getPrompts()).toHaveLength(2);
            expect(promptManager.getSharedPrompt()).toBe('Shared content');
        });

        test('should get configuration correctly', () => {
            const config: PromptConfiguration = {
                customPrompts: [
                    {
                        id: 'test1',
                        name: 'Test Prompt',
                        content: 'Test content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: 'Shared content'
            };

            promptManager.loadConfiguration(config);
            const retrievedConfig = promptManager.getConfiguration();

            expect(retrievedConfig.customPrompts).toHaveLength(1);
            expect(retrievedConfig.sharedPrompt).toBe('Shared content');
        });

        test('should clear existing prompts when loading new configuration', () => {
            // Load initial configuration
            const initialConfig: PromptConfiguration = {
                customPrompts: [
                    {
                        id: 'initial',
                        name: 'Initial Prompt',
                        content: 'Initial content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: 'Initial shared'
            };
            promptManager.loadConfiguration(initialConfig);
            expect(promptManager.getPrompts()).toHaveLength(1);

            // Load new configuration
            const newConfig: PromptConfiguration = {
                customPrompts: [
                    {
                        id: 'new1',
                        name: 'New Prompt 1',
                        content: 'New content 1',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        id: 'new2',
                        name: 'New Prompt 2',
                        content: 'New content 2',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: 'New shared'
            };
            promptManager.loadConfiguration(newConfig);

            expect(promptManager.getPrompts()).toHaveLength(2);
            expect(promptManager.getPrompt('initial')).toBeUndefined();
            expect(promptManager.getPrompt('new1')).toBeDefined();
            expect(promptManager.getPrompt('new2')).toBeDefined();
        });
    });

    describe('Prompt Retrieval', () => {
        beforeEach(() => {
            const config: PromptConfiguration = {
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
                sharedPrompt: 'Shared content'
            };
            promptManager.loadConfiguration(config);
        });

        test('should get all prompts', () => {
            const prompts = promptManager.getPrompts();
            expect(prompts).toHaveLength(2);
            expect(prompts[0].name).toBe('Test Prompt 1');
            expect(prompts[1].name).toBe('Test Prompt 2');
        });

        test('should get prompt by ID', () => {
            const prompt = promptManager.getPrompt('test1');
            expect(prompt).toBeDefined();
            expect(prompt!.name).toBe('Test Prompt 1');
            expect(prompt!.content).toBe('Test content 1');
        });

        test('should return undefined for non-existent prompt ID', () => {
            const prompt = promptManager.getPrompt('nonexistent');
            expect(prompt).toBeUndefined();
        });

        test('should return immutable copies of prompts', () => {
            const prompt = promptManager.getPrompt('test1');
            const originalName = prompt!.name;
            
            // Attempt to modify the returned prompt
            prompt!.name = 'Modified Name';
            
            // Original should be unchanged
            const promptAgain = promptManager.getPrompt('test1');
            expect(promptAgain!.name).toBe(originalName);
        });
    });

    describe('Shared Prompt Management', () => {
        test('should set and get shared prompt', () => {
            promptManager.setSharedPrompt('Test shared prompt');
            expect(promptManager.getSharedPrompt()).toBe('Test shared prompt');
        });

        test('should validate shared prompt length', () => {
            const longContent = 'a'.repeat(2001);
            expect(() => promptManager.setSharedPrompt(longContent)).toThrow('Shared prompt content must not exceed 2000 characters');
        });

        test('should validate shared prompt content', () => {
            expect(promptManager.validateSharedPrompt('Valid content')).toBe(true);
            expect(promptManager.validateSharedPrompt('a'.repeat(2000))).toBe(true);
            expect(promptManager.validateSharedPrompt('a'.repeat(2001))).toBe(false);
        });
    });

    describe('Prompt Combination', () => {
        beforeEach(() => {
            const config: PromptConfiguration = {
                customPrompts: [
                    {
                        id: 'test1',
                        name: 'Test Prompt',
                        content: 'Custom prompt content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: 'Shared prompt content'
            };
            promptManager.loadConfiguration(config);
        });

        test('should combine custom prompt with shared prompt', () => {
            const combined = promptManager.combinePrompts('test1');
            expect(combined).toBe('Custom prompt content\n\nShared prompt content');
        });

        test('should return only custom prompt when shared prompt is empty', () => {
            promptManager.setSharedPrompt('');
            const combined = promptManager.combinePrompts('test1');
            expect(combined).toBe('Custom prompt content');
        });

        test('should throw error for non-existent prompt ID', () => {
            expect(() => promptManager.combinePrompts('nonexistent')).toThrow('Custom prompt with ID "nonexistent" not found');
        });
    });

    describe('Default Prompts', () => {
        test('should ensure default prompts when none exist', () => {
            expect(promptManager.getPrompts()).toHaveLength(0);
            
            promptManager.ensureDefaultPrompts();
            
            expect(promptManager.getPrompts()).toHaveLength(1);
            expect(promptManager.getPrompts()[0].name).toBe('Grammar Correction');
        });

        test('should not add default prompts when prompts already exist', () => {
            const config: PromptConfiguration = {
                customPrompts: [
                    {
                        id: 'existing',
                        name: 'Existing Prompt',
                        content: 'Existing content',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                sharedPrompt: ''
            };
            promptManager.loadConfiguration(config);
            
            promptManager.ensureDefaultPrompts();
            
            expect(promptManager.getPrompts()).toHaveLength(1);
            expect(promptManager.getPrompts()[0].name).toBe('Existing Prompt');
        });
    });
});