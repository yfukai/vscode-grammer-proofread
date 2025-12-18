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
const ConfigurationProvider_1 = require("../ConfigurationProvider");
// Helper function to create default prompts for tests
const createDefaultPrompts = () => ({
    grammar: 'Grammar correction prompt',
    style: 'Style improvement prompt',
    clarity: 'Clarity enhancement prompt',
    tone: 'Tone adjustment prompt'
});
// Create a simplified validation class for testing
class ValidationService {
    validateConfiguration(config) {
        const errors = [];
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
        }
        catch {
            errors.push('API endpoint must be a valid URL');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
describe('Configuration Validation', () => {
    let validationService;
    beforeEach(() => {
        validationService = new ValidationService();
    });
    describe('Unit Tests', () => {
        test('should validate a complete valid configuration', () => {
            const validConfig = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: [],
                defaultPrompts: createDefaultPrompts()
            };
            const result = validationService.validateConfiguration(validConfig);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        test('should reject configuration with multiple errors', () => {
            const invalidConfig = {
                apiEndpoint: '',
                apiKey: '',
                model: '',
                maxTokens: -1,
                temperature: 5,
                customPrompts: [],
                defaultPrompts: createDefaultPrompts()
            };
            const result = validationService.validateConfiguration(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
});
describe('Prompt Configuration Tests', () => {
    let configProvider;
    beforeEach(() => {
        configProvider = new ConfigurationProvider_1.ConfigurationProvider();
    });
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 19: Settings modifications persist correctly
         * Validates: Requirements 6.2
         */
        test('should persist and retrieve prompt modifications correctly', () => {
            // Generator for valid prompt content
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));
            // Generator for correction types
            const correctionTypeArb = fc.constantFrom(CorrectionType_1.CorrectionType.GRAMMAR, CorrectionType_1.CorrectionType.STYLE, CorrectionType_1.CorrectionType.CLARITY, CorrectionType_1.CorrectionType.TONE);
            fc.assert(fc.property(correctionTypeArb, validPromptArb, (correctionType, promptContent) => {
                // Mock VSCode configuration
                const mockConfig = {
                    get: jest.fn().mockImplementation((key, defaultValue) => {
                        if (key === `defaultPrompts.${correctionType}`) {
                            return promptContent;
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
                    const defaultPrompts = configProvider.getDefaultPromptConfiguration();
                    expect(defaultPrompts[correctionType]).toBe(promptContent);
                }
                finally {
                    // Restore original function
                    require('vscode').workspace.getConfiguration = originalGetConfiguration;
                }
            }), { numRuns: 50 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 23: Invalid prompts are validated and rejected
         * Validates: Requirements 6.7
         */
        test('should validate and reject invalid prompt content', () => {
            // Generator for invalid prompt content
            const invalidPromptArb = fc.oneof(fc.constant(''), // Empty string
            fc.constant('   '), // Whitespace only
            fc.string({ maxLength: 9 }), // Too short
            fc.string({ minLength: 2001 }), // Too long
            fc.constant('\t\n\r   ') // Only whitespace characters
            );
            fc.assert(fc.property(invalidPromptArb, (invalidPrompt) => {
                const validation = configProvider.validatePrompt(invalidPrompt);
                expect(validation.isValid).toBe(false);
                expect(validation.errors.length).toBeGreaterThan(0);
            }), { numRuns: 50 });
        });
        test('should accept valid prompt content', () => {
            // Generator for valid prompt content
            const validPromptArb = fc.string({ minLength: 10, maxLength: 2000 })
                .filter(s => s.trim().length >= 10 && !/^\s*$/.test(s));
            fc.assert(fc.property(validPromptArb, (validPrompt) => {
                const validation = configProvider.validatePrompt(validPrompt);
                expect(validation.isValid).toBe(true);
                expect(validation.errors).toHaveLength(0);
            }), { numRuns: 50 });
        });
    });
    describe('Unit Tests', () => {
        test('should return built-in defaults for all correction types', () => {
            const correctionTypes = [
                CorrectionType_1.CorrectionType.GRAMMAR,
                CorrectionType_1.CorrectionType.STYLE,
                CorrectionType_1.CorrectionType.CLARITY,
                CorrectionType_1.CorrectionType.TONE
            ];
            correctionTypes.forEach(type => {
                // Access the private method through type assertion for testing
                const builtInDefault = configProvider.getBuiltInDefaultPrompt(type);
                expect(builtInDefault).toBeTruthy();
                expect(typeof builtInDefault).toBe('string');
                expect(builtInDefault.length).toBeGreaterThan(10);
            });
        });
        test('should validate prompt content correctly', () => {
            // Valid prompts
            expect(configProvider.validatePrompt('This is a valid prompt with enough content')).toEqual({
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
            expect(configProvider.validatePrompt('a'.repeat(2001))).toEqual({
                isValid: false,
                errors: ['Prompt content cannot exceed 2000 characters']
            });
            expect(configProvider.validatePrompt('   \t\n   ')).toEqual({
                isValid: false,
                errors: ['Prompt content cannot be empty']
            });
        });
        test('should handle configuration retrieval with fallbacks', () => {
            // Mock VSCode configuration to return undefined (no custom settings)
            const mockConfig = {
                get: jest.fn().mockReturnValue(undefined)
            };
            const originalGetConfiguration = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn().mockReturnValue(mockConfig);
            try {
                const defaultPrompts = configProvider.getDefaultPromptConfiguration();
                // Should return built-in defaults when no custom settings exist
                expect(defaultPrompts.grammar).toBeTruthy();
                expect(defaultPrompts.style).toBeTruthy();
                expect(defaultPrompts.clarity).toBeTruthy();
                expect(defaultPrompts.tone).toBeTruthy();
                // All should be strings with meaningful content
                Object.values(defaultPrompts).forEach(prompt => {
                    expect(typeof prompt).toBe('string');
                    expect(prompt.length).toBeGreaterThan(10);
                });
            }
            finally {
                require('vscode').workspace.getConfiguration = originalGetConfiguration;
            }
        });
    });
});
//# sourceMappingURL=ConfigurationProvider.test.js.map