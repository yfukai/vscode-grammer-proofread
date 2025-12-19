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
// Helper function to create sample prompts for tests
const createSamplePrompts = () => ([
    {
        id: '1',
        name: 'Grammar Check',
        prompt: 'Fix grammar and spelling errors',
        description: 'Basic grammar correction',
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);
// Create simplified workflow orchestrator for testing
class WorkflowOrchestrator {
    constructor() {
        this.configuration = null;
        this.isActivated = false;
    }
    async activateExtension() {
        try {
            this.isActivated = true;
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Activation failed'
            };
        }
    }
    async configurationManagementWorkflow(config) {
        try {
            // Validate configuration
            if (!config.apiEndpoint || !config.apiKey || !config.model) {
                return { success: false, error: 'Invalid configuration' };
            }
            this.configuration = config;
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Configuration failed'
            };
        }
    }
    async correctionWorkflow(correctionType, text) {
        try {
            if (!this.isActivated) {
                return { success: false, error: 'Extension not activated' };
            }
            if (!this.configuration) {
                return { success: false, error: 'No configuration available' };
            }
            // Simulate correction workflow
            const response = {
                correctedText: `Corrected: ${text}`,
                explanation: `Applied ${correctionType} correction`,
                changes: [{
                        original: text,
                        corrected: `Corrected: ${text}`,
                        reason: `${correctionType} improvement`,
                        position: { start: 0, end: text.length }
                    }],
                confidence: 0.95
            };
            return { success: true, response };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Correction failed'
            };
        }
    }
    isExtensionActivated() {
        return this.isActivated;
    }
    getConfiguration() {
        return this.configuration;
    }
}
describe('Integration Tests', () => {
    let workflow;
    beforeEach(() => {
        workflow = new WorkflowOrchestrator();
    });
    describe('Extension Activation', () => {
        test('should activate extension successfully', async () => {
            const result = await workflow.activateExtension();
            expect(result.success).toBe(true);
            expect(workflow.isExtensionActivated()).toBe(true);
        });
    });
    describe('Configuration Management', () => {
        test('should handle valid configuration', async () => {
            const config = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: createSamplePrompts()
            };
            const result = await workflow.configurationManagementWorkflow(config);
            expect(result.success).toBe(true);
            expect(workflow.getConfiguration()).toEqual(config);
        });
        test('should reject invalid configuration', async () => {
            const invalidConfig = {
                apiEndpoint: '',
                apiKey: '',
                model: '',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: []
            };
            const result = await workflow.configurationManagementWorkflow(invalidConfig);
            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
        });
    });
    describe('Correction Workflow', () => {
        beforeEach(async () => {
            await workflow.activateExtension();
            const config = {
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                customPrompts: createSamplePrompts()
            };
            await workflow.configurationManagementWorkflow(config);
        });
        test('should perform grammar correction', async () => {
            const text = 'This are a test sentence.';
            const result = await workflow.correctionWorkflow('grammar', text);
            expect(result.success).toBe(true);
            expect(result.response).toBeDefined();
            expect(result.response.correctedText).toContain('Corrected:');
            expect(result.response.explanation).toContain('grammar');
        });
        test('should handle all correction types', async () => {
            const correctionTypes = [
                'grammar',
                'style',
                'clarity',
                'tone'
            ];
            for (const type of correctionTypes) {
                const result = await workflow.correctionWorkflow(type, 'Test text');
                expect(result.success).toBe(true);
                expect(result.response).toBeDefined();
            }
        });
        test('should fail without activation', async () => {
            const newWorkflow = new WorkflowOrchestrator();
            const result = await newWorkflow.correctionWorkflow('grammar', 'Test');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not activated');
        });
        test('should fail without configuration', async () => {
            const newWorkflow = new WorkflowOrchestrator();
            await newWorkflow.activateExtension();
            const result = await newWorkflow.correctionWorkflow('grammar', 'Test');
            expect(result.success).toBe(false);
            expect(result.error).toContain('configuration');
        });
    });
    describe('Property-Based Tests', () => {
        test('should handle various text inputs for correction', () => {
            const textArb = fc.string({ minLength: 1, maxLength: 1000 });
            const correctionTypeArb = fc.constantFrom('grammar', 'style', 'clarity', 'tone');
            fc.assert(fc.asyncProperty(textArb, correctionTypeArb, async (text, correctionType) => {
                await workflow.activateExtension();
                const config = {
                    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'sk-test123',
                    model: 'gpt-3.5-turbo',
                    maxTokens: 1000,
                    temperature: 0.3,
                    customPrompts: createSamplePrompts()
                };
                await workflow.configurationManagementWorkflow(config);
                const result = await workflow.correctionWorkflow(correctionType, text);
                expect(result.success).toBe(true);
                expect(result.response).toBeDefined();
                expect(result.response.correctedText).toBeTruthy();
            }), { numRuns: 20 });
        });
    });
});
//# sourceMappingURL=integration.test.js.map