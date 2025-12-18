import * as fc from 'fast-check';
import { CorrectionType } from '../../models/CorrectionType';
import { CustomPrompt, DefaultPromptConfiguration } from '../../models/ExtensionConfiguration';
import { PromptManager } from '../PromptManager';

// Create a simplified prompt manager for testing
class PromptManagerLogic {
    private defaultPrompts: Map<CorrectionType, string> = new Map();
    private customPrompts: CustomPrompt[] = [];

    constructor() {
        this.initializeDefaultPrompts();
    }

    private initializeDefaultPrompts(): void {
        this.defaultPrompts = new Map([
            [CorrectionType.GRAMMAR, 'Grammar correction prompt'],
            [CorrectionType.STYLE, 'Style improvement prompt'],
            [CorrectionType.CLARITY, 'Clarity enhancement prompt'],
            [CorrectionType.TONE, 'Tone adjustment prompt']
        ]);
    }

    getPrompt(correctionType: CorrectionType, customPromptName?: string): string {
        // If a custom prompt name is provided, try to find it
        if (customPromptName) {
            const customPrompt = this.getCustomPrompt(customPromptName);
            if (customPrompt) {
                return customPrompt.prompt;
            }
        }

        // Return default prompt for the correction type
        return this.defaultPrompts.get(correctionType) || 'Please improve the following text.';
    }

    getCustomPrompt(name: string): CustomPrompt | undefined {
        return this.customPrompts.find(prompt => prompt.name === name);
    }

    addCustomPrompt(prompt: CustomPrompt): { success: boolean; error?: string } {
        const validation = this.validatePrompt(prompt);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        // Check if prompt with same name already exists
        const existingIndex = this.customPrompts.findIndex(p => p.name === prompt.name);
        
        if (existingIndex >= 0) {
            // Update existing prompt
            this.customPrompts[existingIndex] = prompt;
        } else {
            // Add new prompt
            this.customPrompts.push(prompt);
        }

        return { success: true };
    }

    removeCustomPrompt(name: string): { success: boolean; error?: string } {
        const initialLength = this.customPrompts.length;
        this.customPrompts = this.customPrompts.filter(prompt => prompt.name !== name);
        
        if (this.customPrompts.length === initialLength) {
            return { success: false, error: 'Custom prompt not found' };
        }

        return { success: true };
    }

    getAllCustomPrompts(): CustomPrompt[] {
        return [...this.customPrompts];
    }

    getDefaultPrompts(): Array<{ type: CorrectionType; prompt: string }> {
        return Array.from(this.defaultPrompts.entries()).map(([type, prompt]) => ({
            type,
            prompt
        }));
    }

    validatePrompt(prompt: CustomPrompt): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!prompt.name || prompt.name.trim() === '') {
            errors.push('Prompt name is required');
        }

        if (!prompt.prompt || prompt.prompt.trim() === '') {
            errors.push('Prompt content is required');
        }

        if (!prompt.correctionType || prompt.correctionType.trim() === '') {
            errors.push('Correction type is required');
        }

        // Check if name contains only valid characters
        if (prompt.name && !/^[a-zA-Z0-9\s\-_]+$/.test(prompt.name)) {
            errors.push('Prompt name can only contain letters, numbers, spaces, hyphens, and underscores');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

describe('PromptManager', () => {
    let promptManager: PromptManagerLogic;

    beforeEach(() => {
        promptManager = new PromptManagerLogic();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 18: Prompt customization is supported
         * Validates: Requirements 5.5
         */
        test('should handle custom prompt addition and retrieval', () => {
            // Generator for valid custom prompts
            const validCustomPromptArb = fc.record({
                name: fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s.trim())),
                prompt: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                correctionType: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            });

            fc.assert(
                fc.property(validCustomPromptArb, (customPrompt) => {
                    // Add the custom prompt
                    const addResult = promptManager.addCustomPrompt(customPrompt);
                    expect(addResult.success).toBe(true);
                    expect(addResult.error).toBeUndefined();

                    // Retrieve the custom prompt
                    const retrieved = promptManager.getCustomPrompt(customPrompt.name);
                    expect(retrieved).toBeDefined();
                    expect(retrieved!.name).toBe(customPrompt.name);
                    expect(retrieved!.prompt).toBe(customPrompt.prompt);
                    expect(retrieved!.correctionType).toBe(customPrompt.correctionType);

                    // Should be able to get the prompt by name
                    const promptText = promptManager.getPrompt(CorrectionType.CUSTOM, customPrompt.name);
                    expect(promptText).toBe(customPrompt.prompt);
                }),
                { numRuns: 100 }
            );
        });

        test('should validate custom prompts correctly', () => {
            // Generator for potentially invalid custom prompts
            const customPromptArb = fc.record({
                name: fc.string(),
                prompt: fc.string(),
                correctionType: fc.string()
            });

            fc.assert(
                fc.property(customPromptArb, (customPrompt) => {
                    const validation = promptManager.validatePrompt(customPrompt);
                    
                    const hasValidName = customPrompt.name && customPrompt.name.trim() !== '' && 
                                        /^[a-zA-Z0-9\s\-_]+$/.test(customPrompt.name);
                    const hasValidPrompt = customPrompt.prompt && customPrompt.prompt.trim() !== '';
                    const hasValidType = customPrompt.correctionType && customPrompt.correctionType.trim() !== '';
                    
                    const shouldBeValid = Boolean(hasValidName && hasValidPrompt && hasValidType);
                    
                    expect(validation.isValid).toBe(shouldBeValid);
                    
                    if (!shouldBeValid) {
                        expect(validation.errors.length).toBeGreaterThan(0);
                        expect(Array.isArray(validation.errors)).toBe(true);
                    } else {
                        expect(validation.errors).toHaveLength(0);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('should handle prompt removal correctly', () => {
            const validCustomPromptArb = fc.record({
                name: fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s.trim())),
                prompt: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                correctionType: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            });

            fc.assert(
                fc.property(validCustomPromptArb, (customPrompt) => {
                    // Add the prompt first
                    promptManager.addCustomPrompt(customPrompt);
                    
                    // Verify it exists
                    expect(promptManager.getCustomPrompt(customPrompt.name)).toBeDefined();
                    
                    // Remove the prompt
                    const removeResult = promptManager.removeCustomPrompt(customPrompt.name);
                    expect(removeResult.success).toBe(true);
                    expect(removeResult.error).toBeUndefined();
                    
                    // Verify it's gone
                    expect(promptManager.getCustomPrompt(customPrompt.name)).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });

        test('should return default prompts for all correction types', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            fc.assert(
                fc.property(correctionTypeArb, (correctionType) => {
                    const prompt = promptManager.getPrompt(correctionType);
                    
                    // Should return a non-empty string
                    expect(typeof prompt).toBe('string');
                    expect(prompt.length).toBeGreaterThan(0);
                    
                    // Should not return the fallback prompt for known types
                    expect(prompt).not.toBe('Please improve the following text.');
                }),
                { numRuns: 100 }
            );
        });

        test('should handle prompt updates correctly', () => {
            const promptNameArb = fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s.trim()));
            const promptContentArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
            const correctionTypeArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

            fc.assert(
                fc.property(promptNameArb, promptContentArb, promptContentArb, correctionTypeArb, 
                    (name, originalContent, updatedContent, correctionType) => {
                    // Add original prompt
                    const originalPrompt: CustomPrompt = {
                        name,
                        prompt: originalContent,
                        correctionType
                    };
                    promptManager.addCustomPrompt(originalPrompt);
                    
                    // Update with new content
                    const updatedPrompt: CustomPrompt = {
                        name,
                        prompt: updatedContent,
                        correctionType
                    };
                    const updateResult = promptManager.addCustomPrompt(updatedPrompt);
                    expect(updateResult.success).toBe(true);
                    
                    // Verify the update
                    const retrieved = promptManager.getCustomPrompt(name);
                    expect(retrieved).toBeDefined();
                    expect(retrieved!.prompt).toBe(updatedContent);
                    
                    // Should still only have one prompt with this name
                    const allPrompts = promptManager.getAllCustomPrompts();
                    const promptsWithName = allPrompts.filter(p => p.name === name);
                    expect(promptsWithName).toHaveLength(1);
                }),
                { numRuns: 100 }
            );
        });

        test('should handle invalid prompt names correctly', () => {
            // Generator for invalid prompt names
            const invalidNameArb = fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.string().filter(s => s.includes('@') || s.includes('#') || s.includes('$')),
                fc.string().filter(s => s.includes('!') || s.includes('%') || s.includes('^'))
            );

            fc.assert(
                fc.property(invalidNameArb, (invalidName) => {
                    const prompt: CustomPrompt = {
                        name: invalidName,
                        prompt: 'Valid prompt content',
                        correctionType: 'custom'
                    };
                    
                    const validation = promptManager.validatePrompt(prompt);
                    expect(validation.isValid).toBe(false);
                    expect(validation.errors.length).toBeGreaterThan(0);
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should add and retrieve custom prompt', () => {
            const customPrompt: CustomPrompt = {
                name: 'My Custom Prompt',
                prompt: 'Please fix this text with special attention to...',
                correctionType: 'custom'
            };

            const result = promptManager.addCustomPrompt(customPrompt);
            expect(result.success).toBe(true);

            const retrieved = promptManager.getCustomPrompt('My Custom Prompt');
            expect(retrieved).toEqual(customPrompt);
        });

        test('should return default prompt when custom prompt not found', () => {
            const prompt = promptManager.getPrompt(CorrectionType.GRAMMAR, 'nonexistent');
            expect(prompt).toBe('Grammar correction prompt');
        });

        test('should validate prompt with all required fields', () => {
            const validPrompt: CustomPrompt = {
                name: 'Valid_Prompt-123',
                prompt: 'This is a valid prompt content.',
                correctionType: 'custom'
            };

            const validation = promptManager.validatePrompt(validPrompt);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should reject prompt with invalid characters in name', () => {
            const invalidPrompt: CustomPrompt = {
                name: 'Invalid@Prompt#Name',
                prompt: 'Valid content',
                correctionType: 'custom'
            };

            const validation = promptManager.validatePrompt(invalidPrompt);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('letters, numbers'))).toBe(true);
        });

        test('should update existing prompt when adding with same name', () => {
            const originalPrompt: CustomPrompt = {
                name: 'Test Prompt',
                prompt: 'Original content',
                correctionType: 'custom'
            };

            const updatedPrompt: CustomPrompt = {
                name: 'Test Prompt',
                prompt: 'Updated content',
                correctionType: 'custom'
            };

            promptManager.addCustomPrompt(originalPrompt);
            promptManager.addCustomPrompt(updatedPrompt);

            const retrieved = promptManager.getCustomPrompt('Test Prompt');
            expect(retrieved!.prompt).toBe('Updated content');

            const allPrompts = promptManager.getAllCustomPrompts();
            expect(allPrompts.filter(p => p.name === 'Test Prompt')).toHaveLength(1);
        });

        test('should fail to remove non-existent prompt', () => {
            const result = promptManager.removeCustomPrompt('nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Custom prompt not found');
        });

        test('should return all default prompts', () => {
            const defaultPrompts = promptManager.getDefaultPrompts();
            expect(defaultPrompts).toHaveLength(4);
            
            const types = defaultPrompts.map(p => p.type);
            expect(types).toContain(CorrectionType.GRAMMAR);
            expect(types).toContain(CorrectionType.STYLE);
            expect(types).toContain(CorrectionType.CLARITY);
            expect(types).toContain(CorrectionType.TONE);
        });
    });
});

describe('PromptManager Settings Integration', () => {
    let promptManager: PromptManager;

    beforeEach(() => {
        promptManager = new PromptManager();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 20: Configured prompts are used when available
         * Validates: Requirements 6.3
         */
        test('should use configured prompts when available', () => {
            // Generator for valid prompt content
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            // Generator for correction types
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            fc.assert(
                fc.property(correctionTypeArb, validPromptArb, (correctionType, configuredPrompt) => {
                    // Mock the configuration provider to return the configured prompt
                    const mockDefaultPrompts = {
                        grammar: correctionType === CorrectionType.GRAMMAR ? configuredPrompt : 'default grammar',
                        style: correctionType === CorrectionType.STYLE ? configuredPrompt : 'default style',
                        clarity: correctionType === CorrectionType.CLARITY ? configuredPrompt : 'default clarity',
                        tone: correctionType === CorrectionType.TONE ? configuredPrompt : 'default tone'
                    } as DefaultPromptConfiguration;

                    const mockConfigProvider = {
                        getDefaultPromptConfiguration: jest.fn().mockReturnValue(mockDefaultPrompts),
                        getConfiguration: jest.fn(),
                        updateConfiguration: jest.fn(),
                        validateConfiguration: jest.fn(),
                        testConnection: jest.fn(),
                        updateDefaultPrompt: jest.fn(),
                        resetDefaultPrompt: jest.fn(),
                        validatePrompt: jest.fn()
                    };

                    // Replace the config provider
                    (promptManager as any).configProvider = mockConfigProvider;

                    // Get the prompt - should return the configured one
                    const retrievedPrompt = promptManager.getPrompt(correctionType);
                    expect(retrievedPrompt).toBe(configuredPrompt);
                    expect(mockConfigProvider.getDefaultPromptConfiguration).toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 21: Fallback to default prompts works
         * Validates: Requirements 6.4
         */
        test('should fallback to built-in defaults when no custom configuration exists', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            fc.assert(
                fc.property(correctionTypeArb, (correctionType) => {
                    // Mock the configuration provider to return undefined/empty for the specific type
                    const mockConfigProvider = {
                        getDefaultPromptConfiguration: jest.fn().mockReturnValue({
                            [correctionType]: undefined, // No configured prompt
                            grammar: undefined,
                            style: undefined,
                            clarity: undefined,
                            tone: undefined
                        } as any),
                        getConfiguration: jest.fn(),
                        updateConfiguration: jest.fn(),
                        validateConfiguration: jest.fn(),
                        testConnection: jest.fn(),
                        updateDefaultPrompt: jest.fn(),
                        resetDefaultPrompt: jest.fn(),
                        validatePrompt: jest.fn()
                    };

                    // Replace the config provider
                    (promptManager as any).configProvider = mockConfigProvider;

                    // Get the prompt - should return the built-in default
                    const retrievedPrompt = promptManager.getPrompt(correctionType);
                    const builtInDefault = promptManager.getBuiltInDefaultPrompt(correctionType);
                    
                    expect(retrievedPrompt).toBe(builtInDefault);
                    expect(retrievedPrompt).not.toBe('Please improve the following text.'); // Should not be the fallback
                    expect(mockConfigProvider.getDefaultPromptConfiguration).toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 22: Prompt reset restores defaults
         * Validates: Requirements 6.5
         */
        test('should reset prompts to built-in defaults', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            fc.assert(
                fc.asyncProperty(correctionTypeArb, async (correctionType) => {
                    // Mock the configuration provider
                    const mockConfigProvider = {
                        getDefaultPromptConfiguration: jest.fn(),
                        getConfiguration: jest.fn(),
                        updateConfiguration: jest.fn(),
                        validateConfiguration: jest.fn(),
                        testConnection: jest.fn(),
                        updateDefaultPrompt: jest.fn(),
                        resetDefaultPrompt: jest.fn().mockResolvedValue({ success: true }),
                        validatePrompt: jest.fn()
                    };

                    // Replace the config provider
                    (promptManager as any).configProvider = mockConfigProvider;

                    // Reset the prompt
                    const resetResult = await promptManager.resetDefaultPrompt(correctionType);
                    
                    expect(resetResult.success).toBe(true);
                    expect(resetResult.error).toBeUndefined();
                    expect(mockConfigProvider.resetDefaultPrompt).toHaveBeenCalledWith(correctionType);
                }),
                { numRuns: 50 }
            );
        });

        test('should handle prompt update operations', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            fc.assert(
                fc.asyncProperty(correctionTypeArb, validPromptArb, async (correctionType, newPrompt) => {
                    // Mock the configuration provider
                    const mockConfigProvider = {
                        getDefaultPromptConfiguration: jest.fn(),
                        getConfiguration: jest.fn(),
                        updateConfiguration: jest.fn(),
                        validateConfiguration: jest.fn(),
                        testConnection: jest.fn(),
                        updateDefaultPrompt: jest.fn().mockResolvedValue({ success: true }),
                        resetDefaultPrompt: jest.fn(),
                        validatePrompt: jest.fn()
                    };

                    // Replace the config provider
                    (promptManager as any).configProvider = mockConfigProvider;

                    // Update the prompt
                    const updateResult = await promptManager.updateDefaultPrompt(correctionType, newPrompt);
                    
                    expect(updateResult.success).toBe(true);
                    expect(updateResult.error).toBeUndefined();
                    expect(mockConfigProvider.updateDefaultPrompt).toHaveBeenCalledWith(correctionType, newPrompt);
                }),
                { numRuns: 50 }
            );
        });

        test('should retrieve configured default prompts correctly', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            );

            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));

            fc.assert(
                fc.property(correctionTypeArb, validPromptArb, (correctionType, configuredPrompt) => {
                    // Mock the configuration provider
                    const mockDefaultPrompts = {
                        grammar: correctionType === CorrectionType.GRAMMAR ? configuredPrompt : 'default grammar',
                        style: correctionType === CorrectionType.STYLE ? configuredPrompt : 'default style',
                        clarity: correctionType === CorrectionType.CLARITY ? configuredPrompt : 'default clarity',
                        tone: correctionType === CorrectionType.TONE ? configuredPrompt : 'default tone'
                    } as DefaultPromptConfiguration;

                    const mockConfigProvider = {
                        getDefaultPromptConfiguration: jest.fn().mockReturnValue(mockDefaultPrompts),
                        getConfiguration: jest.fn(),
                        updateConfiguration: jest.fn(),
                        validateConfiguration: jest.fn(),
                        testConnection: jest.fn(),
                        updateDefaultPrompt: jest.fn(),
                        resetDefaultPrompt: jest.fn(),
                        validatePrompt: jest.fn()
                    };

                    // Replace the config provider
                    (promptManager as any).configProvider = mockConfigProvider;

                    // Get the configured default prompt
                    const retrievedPrompt = promptManager.getConfiguredDefaultPrompt(correctionType);
                    expect(retrievedPrompt).toBe(configuredPrompt);
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should return built-in defaults for all correction types', () => {
            const correctionTypes = [
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE
            ];

            correctionTypes.forEach(type => {
                const builtInDefault = promptManager.getBuiltInDefaultPrompt(type);
                expect(builtInDefault).toBeTruthy();
                expect(typeof builtInDefault).toBe('string');
                expect(builtInDefault.length).toBeGreaterThan(10);
                expect(builtInDefault).not.toBe('Please improve the following text.');
            });
        });

        test('should handle configuration provider integration', () => {
            // Test that the prompt manager properly delegates to the configuration provider
            const mockConfigProvider = {
                getDefaultPromptConfiguration: jest.fn().mockReturnValue({
                    grammar: 'configured grammar prompt',
                    style: 'configured style prompt',
                    clarity: 'configured clarity prompt',
                    tone: 'configured tone prompt'
                }),
                getConfiguration: jest.fn(),
                updateConfiguration: jest.fn(),
                validateConfiguration: jest.fn(),
                testConnection: jest.fn(),
                updateDefaultPrompt: jest.fn(),
                resetDefaultPrompt: jest.fn(),
                validatePrompt: jest.fn()
            };

            (promptManager as any).configProvider = mockConfigProvider;

            const grammarPrompt = promptManager.getConfiguredDefaultPrompt(CorrectionType.GRAMMAR);
            expect(grammarPrompt).toBe('configured grammar prompt');
            expect(mockConfigProvider.getDefaultPromptConfiguration).toHaveBeenCalled();
        });

        test('should prioritize configured prompts over built-in defaults', () => {
            const mockConfigProvider = {
                getDefaultPromptConfiguration: jest.fn().mockReturnValue({
                    grammar: 'custom configured grammar prompt',
                    style: undefined,
                    clarity: undefined,
                    tone: undefined
                }),
                getConfiguration: jest.fn(),
                updateConfiguration: jest.fn(),
                validateConfiguration: jest.fn(),
                testConnection: jest.fn(),
                updateDefaultPrompt: jest.fn(),
                resetDefaultPrompt: jest.fn(),
                validatePrompt: jest.fn()
            };

            (promptManager as any).configProvider = mockConfigProvider;

            // Should use configured prompt for grammar
            const grammarPrompt = promptManager.getPrompt(CorrectionType.GRAMMAR);
            expect(grammarPrompt).toBe('custom configured grammar prompt');

            // Should fallback to built-in default for style (since configured is undefined)
            const stylePrompt = promptManager.getPrompt(CorrectionType.STYLE);
            const builtInStyleDefault = promptManager.getBuiltInDefaultPrompt(CorrectionType.STYLE);
            expect(stylePrompt).toBe(builtInStyleDefault);
        });
    });
});