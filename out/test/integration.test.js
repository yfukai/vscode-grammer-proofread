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
const CorrectionType_1 = require("../models/CorrectionType");
// Create simplified workflow orchestrator for testing
class WorkflowOrchestrator {
    constructor() {
        this.configuration = null;
        this.isActivated = false;
    }
    // Simulate extension activation
    activate() {
        this.isActivated = true;
        return {
            success: true,
            commandsRegistered: 6 // Grammar, Style, Clarity, Tone, Custom, Settings
        };
    }
    // Simulate configuration setup
    setConfiguration(config) {
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
        if (config.temperature < 0 || config.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }
        if (errors.length === 0) {
            this.configuration = config;
            return { success: true, errors: [] };
        }
        return { success: false, errors };
    }
    // Simulate complete correction workflow
    async performCorrectionWorkflow(correctionType, inputText, customPrompt) {
        const steps = [];
        try {
            // Step 1: Check activation
            if (!this.isActivated) {
                return {
                    success: false,
                    error: 'Extension not activated',
                    steps: ['activation_check_failed']
                };
            }
            steps.push('activation_verified');
            // Step 2: Validate configuration
            if (!this.configuration) {
                return {
                    success: false,
                    error: 'Configuration not set',
                    steps: [...steps, 'configuration_check_failed']
                };
            }
            steps.push('configuration_validated');
            // Step 3: Validate input text
            if (!inputText || inputText.trim() === '') {
                return {
                    success: false,
                    error: 'No text to process',
                    steps: [...steps, 'text_validation_failed']
                };
            }
            steps.push('text_validated');
            // Step 4: Build correction request
            const request = {
                text: inputText,
                prompt: customPrompt || this.getDefaultPrompt(correctionType),
                correctionType,
                apiEndpoint: this.configuration.apiEndpoint,
                apiKey: this.configuration.apiKey
            };
            steps.push('request_built');
            // Step 5: Simulate API call
            const apiResponse = await this.simulateApiCall(request);
            if (!apiResponse.success) {
                return {
                    success: false,
                    error: apiResponse.error,
                    steps: [...steps, 'api_call_failed']
                };
            }
            steps.push('api_call_successful');
            // Step 6: Validate response
            const validationResult = this.validateResponse(apiResponse.response);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    error: `Invalid response: ${validationResult.errors.join(', ')}`,
                    steps: [...steps, 'response_validation_failed']
                };
            }
            steps.push('response_validated');
            // Step 7: Process response
            steps.push('response_processed');
            return {
                success: true,
                response: apiResponse.response,
                steps
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                steps: [...steps, 'workflow_error']
            };
        }
    }
    // Simulate configuration management workflow
    async configurationManagementWorkflow(newConfig) {
        const steps = [];
        try {
            // Step 1: Validate configuration
            const configResult = this.setConfiguration(newConfig);
            steps.push('configuration_validation');
            if (!configResult.success) {
                return {
                    success: false,
                    configurationValid: false,
                    connectionTested: false,
                    error: configResult.errors.join(', '),
                    steps: [...steps, 'configuration_invalid']
                };
            }
            steps.push('configuration_valid');
            // Step 2: Test connection
            const connectionResult = await this.testConnection(newConfig);
            steps.push('connection_test');
            return {
                success: connectionResult.success,
                configurationValid: true,
                connectionTested: true,
                error: connectionResult.error,
                steps: [...steps, connectionResult.success ? 'connection_successful' : 'connection_failed']
            };
        }
        catch (error) {
            return {
                success: false,
                configurationValid: false,
                connectionTested: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                steps: [...steps, 'workflow_error']
            };
        }
    }
    // Simulate error recovery workflow
    async errorRecoveryWorkflow(errorType) {
        const steps = [];
        let retryAttempts = 0;
        const maxRetries = 3;
        steps.push('error_detected');
        while (retryAttempts < maxRetries) {
            retryAttempts++;
            steps.push(`retry_attempt_${retryAttempts}`);
            // Simulate recovery based on error type
            const recoverySuccess = this.simulateRecovery(errorType, retryAttempts);
            if (recoverySuccess) {
                steps.push('recovery_successful');
                return {
                    success: true,
                    recovered: true,
                    retryAttempts,
                    steps
                };
            }
            steps.push(`retry_${retryAttempts}_failed`);
        }
        steps.push('recovery_failed');
        return {
            success: false,
            recovered: false,
            retryAttempts,
            finalError: `Failed to recover from ${errorType} error after ${maxRetries} attempts`,
            steps
        };
    }
    getDefaultPrompt(correctionType) {
        const prompts = {
            [CorrectionType_1.CorrectionType.GRAMMAR]: 'Fix grammatical errors',
            [CorrectionType_1.CorrectionType.STYLE]: 'Improve writing style',
            [CorrectionType_1.CorrectionType.CLARITY]: 'Enhance clarity',
            [CorrectionType_1.CorrectionType.TONE]: 'Adjust tone',
            [CorrectionType_1.CorrectionType.CUSTOM]: 'Apply custom corrections'
        };
        return prompts[correctionType] || 'Improve text';
    }
    async simulateApiCall(request) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));
        // Simulate various API responses based on input
        if (request.text.includes('error')) {
            return { success: false, error: 'API error occurred' };
        }
        if (request.text.length > 10000) {
            return { success: false, error: 'Text too long' };
        }
        // Generate mock successful response
        const response = {
            correctedText: request.text.replace(/\berror\b/g, 'correction'),
            explanation: `Applied ${request.correctionType} corrections`,
            changes: [
                {
                    original: 'error',
                    corrected: 'correction',
                    reason: 'word choice improvement',
                    position: { start: 0, end: 5 }
                }
            ],
            confidence: 0.9
        };
        return { success: true, response };
    }
    validateResponse(response) {
        const errors = [];
        if (!response.correctedText) {
            errors.push('Missing corrected text');
        }
        if (!response.explanation) {
            errors.push('Missing explanation');
        }
        if (response.confidence < 0 || response.confidence > 1) {
            errors.push('Invalid confidence value');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    async testConnection(config) {
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 5));
        if (config.apiKey === 'invalid') {
            return { success: false, error: 'Invalid API key' };
        }
        if (config.apiEndpoint.includes('unreachable')) {
            return { success: false, error: 'Endpoint unreachable' };
        }
        return { success: true };
    }
    simulateRecovery(errorType, attempt) {
        // Simulate recovery success based on error type and attempt
        const recoveryChances = {
            network: [0.3, 0.6, 0.9],
            validation: [0.8, 0.9, 1.0],
            configuration: [0.5, 0.7, 0.9],
            api: [0.2, 0.4, 0.7] // Lower chance for API errors
        };
        const chances = recoveryChances[errorType] || [0.1, 0.2, 0.3];
        return Math.random() < chances[attempt - 1];
    }
    isExtensionActivated() {
        return this.isActivated;
    }
    getConfiguration() {
        return this.configuration;
    }
}
describe('Integration Tests - Complete Workflows', () => {
    let workflow;
    beforeEach(() => {
        workflow = new WorkflowOrchestrator();
    });
    describe('End-to-End Correction Workflows', () => {
        test('should complete full correction workflow successfully', async () => {
            // Setup
            workflow.activate();
            const config = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            workflow.setConfiguration(config);
            // Execute workflow
            const result = await workflow.performCorrectionWorkflow(CorrectionType_1.CorrectionType.GRAMMAR, 'This is a test sentence with some issues.');
            // Verify
            expect(result.success).toBe(true);
            expect(result.response).toBeDefined();
            expect(result.steps).toContain('activation_verified');
            expect(result.steps).toContain('configuration_validated');
            expect(result.steps).toContain('text_validated');
            expect(result.steps).toContain('request_built');
            expect(result.steps).toContain('api_call_successful');
            expect(result.steps).toContain('response_validated');
            expect(result.steps).toContain('response_processed');
        });
        test('should handle workflow failures gracefully', async () => {
            // Test without activation
            const result = await workflow.performCorrectionWorkflow(CorrectionType_1.CorrectionType.GRAMMAR, 'Test text');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Extension not activated');
            expect(result.steps).toContain('activation_check_failed');
        });
        test('should handle API errors in workflow', async () => {
            // Setup
            workflow.activate();
            const config = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            workflow.setConfiguration(config);
            // Execute with text that triggers API error
            const result = await workflow.performCorrectionWorkflow(CorrectionType_1.CorrectionType.GRAMMAR, 'This text contains error keyword');
            expect(result.success).toBe(false);
            expect(result.error).toBe('API error occurred');
            expect(result.steps).toContain('api_call_failed');
        });
    });
    describe('Configuration Management Workflows', () => {
        test('should complete configuration workflow successfully', async () => {
            const validConfig = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-valid123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            const result = await workflow.configurationManagementWorkflow(validConfig);
            expect(result.success).toBe(true);
            expect(result.configurationValid).toBe(true);
            expect(result.connectionTested).toBe(true);
            expect(result.steps).toContain('configuration_validation');
            expect(result.steps).toContain('configuration_valid');
            expect(result.steps).toContain('connection_test');
            expect(result.steps).toContain('connection_successful');
        });
        test('should handle invalid configuration', async () => {
            const invalidConfig = {
                apiEndpoint: '',
                apiKey: '',
                model: '',
                maxTokens: -1,
                temperature: 5,
                customPrompts: []
            };
            const result = await workflow.configurationManagementWorkflow(invalidConfig);
            expect(result.success).toBe(false);
            expect(result.configurationValid).toBe(false);
            expect(result.connectionTested).toBe(false);
            expect(result.error).toContain('API endpoint is required');
            expect(result.steps).toContain('configuration_invalid');
        });
        test('should handle connection failures', async () => {
            const configWithBadKey = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'invalid',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            const result = await workflow.configurationManagementWorkflow(configWithBadKey);
            expect(result.success).toBe(false);
            expect(result.configurationValid).toBe(true);
            expect(result.connectionTested).toBe(true);
            expect(result.error).toBe('Invalid API key');
            expect(result.steps).toContain('connection_failed');
        });
    });
    describe('Error Recovery Workflows', () => {
        test('should recover from network errors', async () => {
            const result = await workflow.errorRecoveryWorkflow('network');
            // Network errors have increasing recovery chances
            expect(result.retryAttempts).toBeGreaterThan(0);
            expect(result.retryAttempts).toBeLessThanOrEqual(3);
            expect(result.steps).toContain('error_detected');
            expect(result.steps).toContain('retry_attempt_1');
            if (result.success) {
                expect(result.recovered).toBe(true);
                expect(result.steps).toContain('recovery_successful');
            }
            else {
                expect(result.recovered).toBe(false);
                expect(result.steps).toContain('recovery_failed');
                expect(result.finalError).toContain('Failed to recover from network error');
            }
        });
        test('should handle validation errors with high recovery rate', async () => {
            const result = await workflow.errorRecoveryWorkflow('validation');
            // Validation errors should have high recovery success
            expect(result.retryAttempts).toBeGreaterThan(0);
            expect(result.steps).toContain('error_detected');
            // Most validation errors should recover quickly
            if (result.retryAttempts <= 2) {
                expect(result.success).toBe(true);
                expect(result.recovered).toBe(true);
            }
        });
        test('should track retry attempts correctly', async () => {
            const result = await workflow.errorRecoveryWorkflow('api');
            expect(result.retryAttempts).toBeGreaterThanOrEqual(1);
            expect(result.retryAttempts).toBeLessThanOrEqual(3);
            // Should have retry attempt steps
            for (let i = 1; i <= result.retryAttempts; i++) {
                expect(result.steps).toContain(`retry_attempt_${i}`);
            }
        });
    });
    describe('Property-Based Integration Tests', () => {
        test('should handle various correction types consistently', async () => {
            const correctionTypeArb = fc.constantFrom(CorrectionType_1.CorrectionType.GRAMMAR, CorrectionType_1.CorrectionType.STYLE, CorrectionType_1.CorrectionType.CLARITY, CorrectionType_1.CorrectionType.TONE, CorrectionType_1.CorrectionType.CUSTOM);
            const textArb = fc.string({ minLength: 1, maxLength: 1000 }).filter(s => !s.includes('error') && s.trim().length > 0);
            await fc.assert(fc.asyncProperty(correctionTypeArb, textArb, async (correctionType, text) => {
                // Setup
                workflow.activate();
                const config = {
                    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'sk-test123',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.3,
                    customPrompts: []
                };
                workflow.setConfiguration(config);
                // Execute
                const result = await workflow.performCorrectionWorkflow(correctionType, text);
                // Verify
                expect(result.success).toBe(true);
                expect(result.response).toBeDefined();
                expect(result.response.correctedText).toBeDefined();
                expect(result.steps.length).toBeGreaterThan(5);
            }), { numRuns: 20 } // Fewer runs for async tests
            );
        });
        test('should validate configuration parameters consistently', async () => {
            const configArb = fc.record({
                apiEndpoint: fc.oneof(fc.webUrl(), fc.constant(''), fc.string()),
                apiKey: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')),
                model: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')),
                maxTokens: fc.integer({ min: -100, max: 10000 }),
                temperature: fc.float({ min: -1, max: 5 }),
                customPrompts: fc.array(fc.record({
                    name: fc.string(),
                    prompt: fc.string(),
                    correctionType: fc.string()
                }))
            });
            await fc.assert(fc.asyncProperty(configArb, async (config) => {
                const result = await workflow.configurationManagementWorkflow(config);
                // Should always complete the workflow
                expect(result.steps).toContain('configuration_validation');
                // Validation should be consistent
                const hasValidEndpoint = Boolean(config.apiEndpoint && config.apiEndpoint.trim() !== '');
                const hasValidKey = Boolean(config.apiKey && config.apiKey.trim() !== '');
                const hasValidModel = Boolean(config.model && config.model.trim() !== '');
                const hasValidTokens = config.maxTokens > 0;
                const hasValidTemp = config.temperature >= 0 && config.temperature <= 2;
                const shouldBeValid = hasValidEndpoint && hasValidKey && hasValidModel &&
                    hasValidTokens && hasValidTemp;
                expect(result.configurationValid).toBe(shouldBeValid);
                if (shouldBeValid) {
                    expect(result.connectionTested).toBe(true);
                }
            }), { numRuns: 50 });
        });
    });
    describe('Workflow State Management', () => {
        test('should maintain consistent state throughout workflow', async () => {
            // Initial state
            expect(workflow.isExtensionActivated()).toBe(false);
            expect(workflow.getConfiguration()).toBeNull();
            // After activation
            workflow.activate();
            expect(workflow.isExtensionActivated()).toBe(true);
            // After configuration
            const config = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            workflow.setConfiguration(config);
            expect(workflow.getConfiguration()).toEqual(config);
            // State should persist through workflow execution
            const result = await workflow.performCorrectionWorkflow(CorrectionType_1.CorrectionType.GRAMMAR, 'Test text');
            expect(result.success).toBe(true);
            expect(workflow.isExtensionActivated()).toBe(true);
            expect(workflow.getConfiguration()).toEqual(config);
        });
    });
});
//# sourceMappingURL=integration.test.js.map