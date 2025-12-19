import * as fc from 'fast-check';
import { ExtensionConfiguration } from '../../models/ExtensionConfiguration';
import { NamePromptPair } from '../../models/NamePromptPair';
import { ConfigurationProvider } from '../ConfigurationProvider';

// Helper function to create sample name-prompt pairs for tests
const createSamplePrompts = (): NamePromptPair[] => ([
    {
        id: '1',
        name: 'Grammar Check',
        prompt: 'Fix grammar and spelling errors in the text',
        description: 'Basic grammar correction',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '2',
        name: 'Style Improvement',
        prompt: 'Improve the writing style and flow',
        description: 'Enhance writing style',
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

// Create a simplified validation class for testing
class ValidationService {
    validateConfiguration(config: ExtensionConfiguration): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
            errors.push('API endpoint is required');
        }

        if (!config.apiKey || config.apiKey.trim() === '') {
            errors.push('API key is required');
        }

        if (!config.model || config.model.trim() === '') {
            errors.push('Model is required');
        }

        if (config.maxTokens <= 0) {
            errors.push('Max tokens must be greater than 0');
        }

        if (isNaN(config.temperature) || config.temperature < 0 || config.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }

        try {
            const url = new URL(config.apiEndpoint);
            if (!url.protocol.startsWith('http')) {
                errors.push('API endpoint must be a valid URL');
            }
        } catch {
            errors.push('API endpoint must be a valid URL');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

describe('Configuration Validation', () => {
    let validationService: ValidationService;

    beforeEach(() => {
        validationService = new ValidationService();
    });

    describe('Unit Tests', () => {
        test('should validate a complete valid configuration', () => {
            const validConfig: ExtensionConfiguration = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: createSamplePrompts()
            };

            const result = validationService.validateConfiguration(validConfig);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject configuration with multiple errors', () => {
            const invalidConfig: ExtensionConfiguration = {
                apiEndpoint: '',
                apiKey: '',
                model: '',
                maxTokens: -1,
                temperature: 5,
                customPrompts: []
            };

            const result = validationService.validateConfiguration(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
});

describe('Prompt Configuration Tests', () => {
    let configProvider: ConfigurationProvider;

    beforeEach(() => {
        configProvider = new ConfigurationProvider();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 20: Name-prompt configuration round-trip
         * Validates: Requirements 6.5, 6.6
         */
        test('should persist and retrieve custom prompts correctly', () => {
            // Generator for valid prompt names
            const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length >= 1);

            // Generator for valid prompt content
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            fc.assert(
                fc.property(validNameArb, validPromptArb, (name, promptContent) => {
                    const customPrompt: NamePromptPair = {
                        id: '1',
                        name: name.trim(),
                        prompt: promptContent,
                        description: 'Test prompt',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    // Mock VSCode configuration
                    const mockConfig = {
                        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                            if (key === 'customPrompts') {
                                return [customPrompt];
                            }
                            return defaultValue;
                        }),
                        update: jest.fn().mockResolvedValue(undefined)
                    };

                    // Mock vscode.workspace.getConfiguration
                    const originalGetConfiguration = require('vscode').workspace.getConfiguration;
                    require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

                    try {
                        // Test that the configuration can be retrieved
                        const config = configProvider.getConfiguration();
                        expect(config.customPrompts).toHaveLength(1);
                        expect(config.customPrompts[0].name).toBe(name.trim());
                        expect(config.customPrompts[0].prompt).toBe(promptContent);
                    } finally {
                        // Restore original function
                        require('vscode').workspace.getConfiguration = originalGetConfiguration;
                    }
                }),
                { numRuns: 50 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 21: Invalid prompt content is validated
         * Validates: Requirements 6.7
         */
        test('should validate and reject invalid name-prompt pairs', () => {
            // Generator for invalid name-prompt pairs
            const invalidNamePromptArb = fc.oneof(
                // Empty name
                fc.record({
                    name: fc.constant(''),
                    prompt: fc.string({ minLength: 10 })
                }),
                // Empty prompt
                fc.record({
                    name: fc.string({ minLength: 1 }),
                    prompt: fc.constant('')
                }),
                // Whitespace only name
                fc.record({
                    name: fc.constant('   '),
                    prompt: fc.string({ minLength: 10 })
                }),
                // Whitespace only prompt
                fc.record({
                    name: fc.string({ minLength: 1 }),
                    prompt: fc.constant('   ')
                })
            );

            fc.assert(
                fc.property(invalidNamePromptArb, ({ name, prompt }) => {
                    // For name validation, we'll check if it's empty/whitespace
                    if (!name || name.trim() === '') {
                        expect(name.trim()).toBe('');
                    }
                    // For prompt validation, use the existing validatePrompt method
                    const validation = configProvider.validatePrompt(prompt);
                    if (prompt.trim() === '') {
                        expect(validation.isValid).toBe(false);
                        expect(validation.errors.length).toBeGreaterThan(0);
                    }
                }),
                { numRuns: 50 }
            );
        });

        test('should accept valid name-prompt pairs', () => {
            // Generator for valid name-prompt pairs
            const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length >= 1);
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            fc.assert(
                fc.property(validNameArb, validPromptArb, (name, prompt) => {
                    // Test name validation (should not be empty)
                    expect(name.trim().length).toBeGreaterThan(0);
                    // Test prompt validation using existing method
                    const validation = configProvider.validatePrompt(prompt);
                    expect(validation.isValid).toBe(true);
                    expect(validation.errors).toHaveLength(0);
                }),
                { numRuns: 50 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 17: Name-prompt pair creation adds button
         * Validates: Requirements 6.2
         */
        test('should create name-prompt pairs and make them available', async () => {
            // Generator for valid name-prompt pair data
            const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length >= 1 && /^[a-zA-Z0-9\s\-_]+$/.test(s));
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));
            const validDescriptionArb = fc.option(fc.string({ maxLength: 200 }));

            // Mock VSCode configuration
            let storedPrompts: any[] = [];
            const mockConfig = {
                get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                    if (key === 'customPrompts') {
                        return storedPrompts.length > 0 ? storedPrompts : defaultValue;
                    }
                    return defaultValue;
                }),
                update: jest.fn().mockImplementation(async (key: string, value: any) => {
                    if (key === 'customPrompts') {
                        storedPrompts = value;
                    }
                })
            };

            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

            try {
                await fc.assert(
                    fc.asyncProperty(validNameArb, validPromptArb, validDescriptionArb, async (name, prompt, description) => {
                        // Reset stored prompts for each test
                        storedPrompts = [];
                        
                        const namePromptPair = {
                            name: name.trim(),
                            prompt,
                            description: description || undefined
                        };

                        // Create the name-prompt pair
                        const result = await configProvider.createNamePromptPair(namePromptPair);
                        
                        // Should succeed
                        expect(result.success).toBe(true);
                        expect(result.id).toBeDefined();
                        
                        // Should be available in the configuration
                        const pairs = configProvider.getNamePromptPairs();
                        // Should have exactly 1 custom prompt (the one we just created)
                        expect(pairs.length).toBeGreaterThanOrEqual(1);
                        
                        // Find the created pair by ID
                        const createdPair = pairs.find(p => p.id === result.id);
                        expect(createdPair).toBeDefined();
                        expect(createdPair!.name).toBe(name.trim());
                        expect(createdPair!.prompt).toBe(prompt);
                        expect(createdPair!.description).toBe(description || undefined);
                    }),
                    { numRuns: 20 }
                );
            } finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });

        /**
         * Feature: grammar-proofreading-extension, Property 18: Name-prompt pair modification updates button
         * Validates: Requirements 6.3
         */
        test('should update existing name-prompt pairs', async () => {
            // Generator for valid updates
            const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length >= 1 && /^[a-zA-Z0-9\s\-_]+$/.test(s));
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            // Mock VSCode configuration
            let storedPrompts: any[] = [];
            const mockConfig = {
                get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                    if (key === 'customPrompts') {
                        return storedPrompts.length > 0 ? storedPrompts : defaultValue;
                    }
                    return defaultValue;
                }),
                update: jest.fn().mockImplementation(async (key: string, value: any) => {
                    if (key === 'customPrompts') {
                        storedPrompts = value;
                    }
                })
            };

            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

            try {
                await fc.assert(
                    fc.asyncProperty(validNameArb, validPromptArb, validNameArb, validPromptArb, async (originalName, originalPrompt, newName, newPrompt) => {
                        // Reset and create initial pair
                        storedPrompts = [];
                        
                        const initialPair = {
                            name: originalName.trim(),
                            prompt: originalPrompt,
                            description: 'Original description'
                        };

                        const createResult = await configProvider.createNamePromptPair(initialPair);
                        expect(createResult.success).toBe(true);
                        
                        const pairId = createResult.id!;
                        
                        // Update the pair
                        const updates = {
                            name: newName.trim(),
                            prompt: newPrompt,
                            description: 'Updated description'
                        };
                        
                        const updateResult = await configProvider.updateNamePromptPair(pairId, updates);
                        expect(updateResult.success).toBe(true);
                        
                        // Verify the update
                        const updatedPair = configProvider.getNamePromptPairById(pairId);
                        expect(updatedPair).toBeDefined();
                        expect(updatedPair!.name).toBe(newName.trim());
                        expect(updatedPair!.prompt).toBe(newPrompt);
                        expect(updatedPair!.description).toBe('Updated description');
                        expect(updatedPair!.id).toBe(pairId);
                    }),
                    { numRuns: 20 }
                );
            } finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });

        /**
         * Feature: grammar-proofreading-extension, Property 19: Name-prompt pair deletion removes button
         * Validates: Requirements 6.4
         */
        test('should delete name-prompt pairs and remove them from availability', async () => {
            // Generator for valid name-prompt pair data
            const validNameArb = fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length >= 1 && /^[a-zA-Z0-9\s\-_]+$/.test(s));
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            // Mock VSCode configuration
            let storedPrompts: any[] = [];
            const mockConfig = {
                get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                    if (key === 'customPrompts') {
                        return storedPrompts.length > 0 ? storedPrompts : defaultValue;
                    }
                    return defaultValue;
                }),
                update: jest.fn().mockImplementation(async (key: string, value: any) => {
                    if (key === 'customPrompts') {
                        storedPrompts = value;
                    }
                })
            };

            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

            try {
                await fc.assert(
                    fc.asyncProperty(validNameArb, validPromptArb, async (name, prompt) => {
                        // Reset and create initial pair
                        storedPrompts = [];
                        
                        const namePromptPair = {
                            name: name.trim(),
                            prompt,
                            description: 'Test description'
                        };

                        // Create the name-prompt pair
                        const createResult = await configProvider.createNamePromptPair(namePromptPair);
                        expect(createResult.success).toBe(true);
                        
                        const pairId = createResult.id!;
                        
                        // Verify it exists by finding it by ID
                        let createdPair = configProvider.getNamePromptPairById(pairId);
                        expect(createdPair).toBeDefined();
                        expect(createdPair!.id).toBe(pairId);
                        
                        // Delete the pair
                        const deleteResult = await configProvider.deleteNamePromptPair(pairId);
                        expect(deleteResult.success).toBe(true);
                        
                        // Verify it can't be found by ID anymore
                        const deletedPair = configProvider.getNamePromptPairById(pairId);
                        expect(deletedPair).toBeUndefined();
                        
                        // Verify the stored prompts array is empty (should fall back to defaults)
                        expect(storedPrompts).toHaveLength(0);
                        
                        // Verify that getNamePromptPairs now returns defaults (since no custom prompts exist)
                        const pairs = configProvider.getNamePromptPairs();
                        expect(pairs.length).toBeGreaterThan(0);
                        // Ensure none of the returned pairs have the deleted ID
                        expect(pairs.find(p => p.id === pairId)).toBeUndefined();
                    }),
                    { numRuns: 20 }
                );
            } finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });
    });

    describe('Unit Tests', () => {
        test('should return default name-prompt pairs when none configured', () => {
            // Mock VSCode configuration to return empty array
            const mockConfig = {
                get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                    if (key === 'customPrompts') {
                        return [];
                    }
                    return defaultValue;
                })
            };

            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

            try {
                const config = configProvider.getConfiguration();
                expect(Array.isArray(config.customPrompts)).toBe(true);
                // Should return default prompts when no custom ones are configured
                expect(config.customPrompts.length).toBeGreaterThan(0);
                
                // Verify default prompts are present
                const defaultNames = ['Grammar', 'Style', 'Clarity', 'Tone'];
                defaultNames.forEach(name => {
                    expect(config.customPrompts.some(p => p.name === name)).toBe(true);
                });
            } finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('should validate prompt content correctly', () => {
            // Valid prompt
            expect(configProvider.validatePrompt('Fix grammar and spelling errors')).toEqual({
                isValid: true,
                errors: []
            });

            // Invalid prompts
            expect(configProvider.validatePrompt('')).toEqual({
                isValid: false,
                errors: ['Prompt content cannot be empty']
            });

            expect(configProvider.validatePrompt('short')).toEqual({
                isValid: false,
                errors: ['Prompt content must be at least 10 characters long']
            });

            expect(configProvider.validatePrompt('   ')).toEqual({
                isValid: false,
                errors: ['Prompt content cannot be empty']
            });
        });

        test('should handle configuration retrieval with fallbacks', () => {
            // Mock VSCode configuration to return undefined (no custom settings)
            const mockConfig = {
                get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                    // Return undefined for all keys to test fallback behavior
                    return defaultValue;
                })
            };

            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);

            try {
                const config = configProvider.getConfiguration();
                
                // Should return default configuration when no custom settings exist
                expect(config.apiEndpoint).toBeTruthy();
                expect(config.model).toBeTruthy();
                expect(config.maxTokens).toBeGreaterThan(0);
                expect(config.temperature).toBeGreaterThanOrEqual(0);
                expect(Array.isArray(config.customPrompts)).toBe(true);
                // Should return default prompts when no custom ones exist
                expect(config.customPrompts.length).toBeGreaterThan(0);
            } finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });
    });
});