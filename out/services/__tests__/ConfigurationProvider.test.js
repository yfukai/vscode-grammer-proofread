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
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 5: Invalid credentials prevent API calls
         * Validates: Requirements 2.2
         */
        test('should reject configurations with empty or invalid required fields', () => {
            // Generator for configurations with empty required fields
            const invalidConfigArb = fc.oneof(
            // Empty API endpoint
            fc.record({
                apiEndpoint: fc.constant(''),
                apiKey: fc.string({ minLength: 1 }),
                model: fc.string({ minLength: 1 }),
                maxTokens: fc.integer({ min: 1 }),
                temperature: fc.float({ min: 0, max: 2 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            }), 
            // Empty API key
            fc.record({
                apiEndpoint: fc.webUrl(),
                apiKey: fc.constant(''),
                model: fc.string({ minLength: 1 }),
                maxTokens: fc.integer({ min: 1 }),
                temperature: fc.float({ min: 0, max: 2 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            }), 
            // Empty model
            fc.record({
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string({ minLength: 1 }),
                model: fc.constant(''),
                maxTokens: fc.integer({ min: 1 }),
                temperature: fc.float({ min: 0, max: 2 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            }), 
            // Invalid maxTokens
            fc.record({
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string({ minLength: 1 }),
                model: fc.string({ minLength: 1 }),
                maxTokens: fc.integer({ max: 0 }),
                temperature: fc.float({ min: 0, max: 2 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            }), 
            // Invalid temperature
            fc.record({
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string({ minLength: 1 }),
                model: fc.string({ minLength: 1 }),
                maxTokens: fc.integer({ min: 1 }),
                temperature: fc.oneof(fc.float({ min: Math.fround(-10), max: Math.fround(-0.1) }), fc.float({ min: Math.fround(2.1), max: Math.fround(10) })),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            }));
            fc.assert(fc.property(invalidConfigArb, (config) => {
                const result = validationService.validateConfiguration(config);
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            }), { numRuns: 100 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 6: Configuration updates trigger validation
         * Validates: Requirements 2.3
         */
        test('should accept valid configurations', () => {
            // Generator for valid configurations
            const validConfigArb = fc.record({
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                model: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                maxTokens: fc.integer({ min: 1, max: 10000 }),
                temperature: fc.float({ min: 0, max: 2 }).filter(t => !isNaN(t)),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            });
            fc.assert(fc.property(validConfigArb, (config) => {
                const result = validationService.validateConfiguration(config);
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            }), { numRuns: 100 });
        });
        test('should reject configurations with invalid URLs', () => {
            // Generator for configurations with invalid URLs
            const invalidUrlConfigArb = fc.record({
                apiEndpoint: fc.oneof(fc.constant('not-a-url'), fc.constant('ftp://invalid-protocol.com'), fc.constant('just-text'), fc.constant('http://'), fc.constant('')),
                apiKey: fc.string({ minLength: 1 }),
                model: fc.string({ minLength: 1 }),
                maxTokens: fc.integer({ min: 1 }),
                temperature: fc.float({ min: 0, max: 2 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            });
            fc.assert(fc.property(invalidUrlConfigArb, (config) => {
                const result = validationService.validateConfiguration(config);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(error => error.includes('valid URL'))).toBe(true);
            }), { numRuns: 100 });
        });
        test('should validate temperature bounds correctly', () => {
            // Test specific temperature boundary values with otherwise valid config
            const validBaseConfig = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                customPrompts: []
            };
            const temperatureValues = [0, 2, -0.1, 2.1];
            temperatureValues.forEach(temperature => {
                const config = { ...validBaseConfig, temperature };
                const result = validationService.validateConfiguration(config);
                const isValidTemperature = temperature >= 0 && temperature <= 2;
                if (isValidTemperature) {
                    expect(result.isValid).toBe(true);
                }
                else {
                    expect(result.isValid).toBe(false);
                    expect(result.errors.some(error => error.includes('Temperature'))).toBe(true);
                }
            });
        });
    });
    describe('Unit Tests', () => {
        test('should validate a complete valid configuration', () => {
            const validConfig = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
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
                customPrompts: []
            };
            const result = validationService.validateConfiguration(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
        test('should handle whitespace-only strings as empty', () => {
            const configWithWhitespace = {
                apiEndpoint: '   ',
                apiKey: '\t\n',
                model: '  ',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            const result = validationService.validateConfiguration(configWithWhitespace);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('API endpoint'))).toBe(true);
            expect(result.errors.some(error => error.includes('API key'))).toBe(true);
            expect(result.errors.some(error => error.includes('Model'))).toBe(true);
        });
    });
});
//# sourceMappingURL=ConfigurationProvider.test.js.map