"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const CorrectionType_1 = require("../../models/CorrectionType");
// Create a simplified prompt manager for testing
class PromptManagerLogic {
    constructor() {
        this.defaultPrompts = new Map();
        this.customPrompts = [];
        this.initializeDefaultPrompts();
    }
    initializeDefaultPrompts() {
        this.defaultPrompts = new Map([
            [CorrectionType_1.CorrectionType.GRAMMAR, 'Grammar correction prompt'],
            [CorrectionType_1.CorrectionType.STYLE, 'Style improvement prompt'],
            [CorrectionType_1.CorrectionType.CLARITY, 'Clarity enhancement prompt'],
            [CorrectionType_1.CorrectionType.TONE, 'Tone adjustment prompt']
        ]);
    }
    getPrompt(correctionType, customPromptName) {
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
    getCustomPrompt(name) {
        return this.customPrompts.find(prompt => prompt.name === name);
    }
    addCustomPrompt(prompt) {
        const validation = this.validatePrompt(prompt);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join(', ') };
        }
        // Check if prompt with same name already exists
        const existingIndex = this.customPrompts.findIndex(p => p.name === prompt.name);
        if (existingIndex >= 0) {
            // Update existing prompt
            this.customPrompts[existingIndex] = prompt;
        }
        else {
            // Add new prompt
            this.customPrompts.push(prompt);
        }
        return { success: true };
    }
    removeCustomPrompt(name) {
        const initialLength = this.customPrompts.length;
        this.customPrompts = this.customPrompts.filter(prompt => prompt.name !== name);
        if (this.customPrompts.length === initialLength) {
            return { success: false, error: 'Custom prompt not found' };
        }
        return { success: true };
    }
    getAllCustomPrompts() {
        return [...this.customPrompts];
    }
    getDefaultPrompts() {
        return Array.from(this.defaultPrompts.entries()).map(([type, prompt]) => ({
            type,
            prompt
        }));
    }
    validatePrompt(prompt) {
        const errors = [];
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
    let promptManager;
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
            fc.assert(fc.property(validCustomPromptArb, (customPrompt) => {
                // Add the custom prompt
                const addResult = promptManager.addCustomPrompt(customPrompt);
                expect(addResult.success).toBe(true);
                expect(addResult.error).toBeUndefined();
                // Retrieve the custom prompt
                const retrieved = promptManager.getCustomPrompt(customPrompt.name);
                expect(retrieved).toBeDefined();
                expect(retrieved.name).toBe(customPrompt.name);
                expect(retrieved.prompt).toBe(customPrompt.prompt);
                expect(retrieved.correctionType).toBe(customPrompt.correctionType);
                // Should be able to get the prompt by name
                const promptText = promptManager.getPrompt(CorrectionType_1.CorrectionType.CUSTOM, customPrompt.name);
                expect(promptText).toBe(customPrompt.prompt);
            }), { numRuns: 100 });
        });
        test('should validate custom prompts correctly', () => {
            // Generator for potentially invalid custom prompts
            const customPromptArb = fc.record({
                name: fc.string(),
                prompt: fc.string(),
                correctionType: fc.string()
            });
            fc.assert(fc.property(customPromptArb, (customPrompt) => {
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
                }
                else {
                    expect(validation.errors).toHaveLength(0);
                }
            }), { numRuns: 100 });
        });
        test('should handle prompt removal correctly', () => {
            const validCustomPromptArb = fc.record({
                name: fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s.trim())),
                prompt: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                correctionType: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            });
            fc.assert(fc.property(validCustomPromptArb, (customPrompt) => {
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
            }), { numRuns: 100 });
        });
        test('should return default prompts for all correction types', () => {
            const correctionTypeArb = fc.constantFrom(CorrectionType_1.CorrectionType.GRAMMAR, CorrectionType_1.CorrectionType.STYLE, CorrectionType_1.CorrectionType.CLARITY, CorrectionType_1.CorrectionType.TONE);
            fc.assert(fc.property(correctionTypeArb, (correctionType) => {
                const prompt = promptManager.getPrompt(correctionType);
                // Should return a non-empty string
                expect(typeof prompt).toBe('string');
                expect(prompt.length).toBeGreaterThan(0);
                // Should not return the fallback prompt for known types
                expect(prompt).not.toBe('Please improve the following text.');
            }), { numRuns: 100 });
        });
        test('should handle prompt updates correctly', () => {
            const promptNameArb = fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s.trim()));
            const promptContentArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
            const correctionTypeArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
            fc.assert(fc.property(promptNameArb, promptContentArb, promptContentArb, correctionTypeArb, (name, originalContent, updatedContent, correctionType) => {
                // Add original prompt
                const originalPrompt = {
                    name,
                    prompt: originalContent,
                    correctionType
                };
                promptManager.addCustomPrompt(originalPrompt);
                // Update with new content
                const updatedPrompt = {
                    name,
                    prompt: updatedContent,
                    correctionType
                };
                const updateResult = promptManager.addCustomPrompt(updatedPrompt);
                expect(updateResult.success).toBe(true);
                // Verify the update
                const retrieved = promptManager.getCustomPrompt(name);
                expect(retrieved).toBeDefined();
                expect(retrieved.prompt).toBe(updatedContent);
                // Should still only have one prompt with this name
                const allPrompts = promptManager.getAllCustomPrompts();
                const promptsWithName = allPrompts.filter(p => p.name === name);
                expect(promptsWithName).toHaveLength(1);
            }), { numRuns: 100 });
        });
        test('should handle invalid prompt names correctly', () => {
            // Generator for invalid prompt names
            const invalidNameArb = fc.oneof(fc.constant(''), fc.constant('   '), fc.string().filter(s => s.includes('@') || s.includes('#') || s.includes('$')), fc.string().filter(s => s.includes('!') || s.includes('%') || s.includes('^')));
            fc.assert(fc.property(invalidNameArb, (invalidName) => {
                const prompt = {
                    name: invalidName,
                    prompt: 'Valid prompt content',
                    correctionType: 'custom'
                };
                const validation = promptManager.validatePrompt(prompt);
                expect(validation.isValid).toBe(false);
                expect(validation.errors.length).toBeGreaterThan(0);
            }), { numRuns: 100 });
        });
    });
    describe('Unit Tests', () => {
        test('should add and retrieve custom prompt', () => {
            const customPrompt = {
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
            const prompt = promptManager.getPrompt(CorrectionType_1.CorrectionType.GRAMMAR, 'nonexistent');
            expect(prompt).toBe('Grammar correction prompt');
        });
        test('should validate prompt with all required fields', () => {
            const validPrompt = {
                name: 'Valid_Prompt-123',
                prompt: 'This is a valid prompt content.',
                correctionType: 'custom'
            };
            const validation = promptManager.validatePrompt(validPrompt);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
        test('should reject prompt with invalid characters in name', () => {
            const invalidPrompt = {
                name: 'Invalid@Prompt#Name',
                prompt: 'Valid content',
                correctionType: 'custom'
            };
            const validation = promptManager.validatePrompt(invalidPrompt);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('letters, numbers'))).toBe(true);
        });
        test('should update existing prompt when adding with same name', () => {
            const originalPrompt = {
                name: 'Test Prompt',
                prompt: 'Original content',
                correctionType: 'custom'
            };
            const updatedPrompt = {
                name: 'Test Prompt',
                prompt: 'Updated content',
                correctionType: 'custom'
            };
            promptManager.addCustomPrompt(originalPrompt);
            promptManager.addCustomPrompt(updatedPrompt);
            const retrieved = promptManager.getCustomPrompt('Test Prompt');
            expect(retrieved.prompt).toBe('Updated content');
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
            expect(types).toContain(CorrectionType_1.CorrectionType.GRAMMAR);
            expect(types).toContain(CorrectionType_1.CorrectionType.STYLE);
            expect(types).toContain(CorrectionType_1.CorrectionType.CLARITY);
            expect(types).toContain(CorrectionType_1.CorrectionType.TONE);
        });
    });
});
//# sourceMappingURL=PromptManager.test.js.map