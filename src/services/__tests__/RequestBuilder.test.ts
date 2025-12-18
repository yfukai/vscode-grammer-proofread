import * as fc from 'fast-check';
import { RequestBuilder } from '../RequestBuilder';
import { CorrectionRequest } from '../../models/CorrectionRequest';
import { CorrectionType } from '../../models/CorrectionType';

describe('RequestBuilder', () => {
    let requestBuilder: RequestBuilder;

    beforeEach(() => {
        requestBuilder = new RequestBuilder();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 2: Text capture triggers API request
         * Validates: Requirements 1.3
         */
        test('should build valid API requests for any correction request', () => {
            // Generator for correction requests
            const correctionRequestArb = fc.record({
                text: fc.string({ minLength: 1 }),
                prompt: fc.string(),
                correctionType: fc.oneof(
                    fc.constant(CorrectionType.GRAMMAR),
                    fc.constant(CorrectionType.STYLE),
                    fc.constant(CorrectionType.CLARITY),
                    fc.constant(CorrectionType.TONE),
                    fc.constant(CorrectionType.CUSTOM)
                ),
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string()
            });

            const maxTokensArb = fc.integer({ min: 1, max: 4000 });
            const temperatureArb = fc.float({ min: 0, max: 2 });

            fc.assert(
                fc.property(correctionRequestArb, maxTokensArb, temperatureArb, (request, maxTokens, temperature) => {
                    const apiRequest = requestBuilder.buildCorrectionRequest(request, maxTokens, temperature);
                    
                    // Verify the request structure
                    expect(apiRequest).toHaveProperty('model');
                    expect(apiRequest).toHaveProperty('messages');
                    expect(apiRequest).toHaveProperty('max_tokens', maxTokens);
                    expect(apiRequest).toHaveProperty('temperature', temperature);
                    
                    // Verify messages structure
                    expect(Array.isArray(apiRequest.messages)).toBe(true);
                    expect(apiRequest.messages).toHaveLength(2);
                    
                    // Verify system message
                    expect(apiRequest.messages[0]).toHaveProperty('role', 'system');
                    expect(apiRequest.messages[0]).toHaveProperty('content');
                    expect(typeof apiRequest.messages[0].content).toBe('string');
                    expect(apiRequest.messages[0].content.length).toBeGreaterThan(0);
                    
                    // Verify user message
                    expect(apiRequest.messages[1]).toHaveProperty('role', 'user');
                    expect(apiRequest.messages[1]).toHaveProperty('content');
                    expect(typeof apiRequest.messages[1].content).toBe('string');
                    expect(apiRequest.messages[1].content.length).toBeGreaterThan(0);
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 16: API requests combine text and prompts
         * Validates: Requirements 5.3
         */
        test('should properly combine text and prompts in user message', () => {
            const textArb = fc.string({ minLength: 1 });
            const promptArb = fc.string();
            const correctionTypeArb = fc.oneof(
                fc.constant(CorrectionType.GRAMMAR),
                fc.constant(CorrectionType.STYLE),
                fc.constant(CorrectionType.CLARITY),
                fc.constant(CorrectionType.TONE),
                fc.constant(CorrectionType.CUSTOM)
            );

            fc.assert(
                fc.property(textArb, promptArb, correctionTypeArb, (text, prompt, correctionType) => {
                    const request: CorrectionRequest = {
                        text,
                        prompt,
                        correctionType,
                        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                        apiKey: 'test-key'
                    };

                    const apiRequest = requestBuilder.buildCorrectionRequest(request, 1000, 0.3);
                    const userMessage = apiRequest.messages[1].content;

                    // The user message should contain the original text
                    expect(userMessage).toContain(text);

                    // If a custom prompt is provided and not empty, it should be included
                    if (prompt && prompt.trim() !== '') {
                        expect(userMessage).toContain(prompt);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('should generate different system prompts for different correction types', () => {
            const text = 'This is a test sentence.';
            const baseRequest: CorrectionRequest = {
                text,
                prompt: '',
                correctionType: CorrectionType.GRAMMAR,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'test-key'
            };

            const correctionTypes = [
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE,
                CorrectionType.CUSTOM
            ];

            const systemPrompts = correctionTypes.map(type => {
                const request = { ...baseRequest, correctionType: type };
                const apiRequest = requestBuilder.buildCorrectionRequest(request, 1000, 0.3);
                return apiRequest.messages[0].content;
            });

            // Each correction type should generate a unique system prompt
            const uniquePrompts = new Set(systemPrompts);
            expect(uniquePrompts.size).toBe(correctionTypes.length);

            // All prompts should contain the base JSON structure requirement
            systemPrompts.forEach(prompt => {
                expect(prompt).toContain('correctedText');
                expect(prompt).toContain('explanation');
                expect(prompt).toContain('changes');
                expect(prompt).toContain('confidence');
            });
        });

        test('should handle empty and whitespace-only prompts correctly', () => {
            const text = 'Test text for correction.';
            const emptyPrompts = ['', '   ', '\t\n', null, undefined];

            emptyPrompts.forEach(prompt => {
                const request: CorrectionRequest = {
                    text,
                    prompt: prompt || '',
                    correctionType: CorrectionType.GRAMMAR,
                    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                    apiKey: 'test-key'
                };

                const apiRequest = requestBuilder.buildCorrectionRequest(request, 1000, 0.3);
                const userMessage = apiRequest.messages[1].content;

                // Should contain the text
                expect(userMessage).toContain(text);
                
                // Should use default prompt format when custom prompt is empty/whitespace
                expect(userMessage).toContain('Please improve the following text:');
            });
        });
    });

    describe('Unit Tests', () => {
        test('should build a complete API request with all required fields', () => {
            const request: CorrectionRequest = {
                text: 'This is a test sentence with some errors.',
                prompt: 'Fix grammar issues',
                correctionType: CorrectionType.GRAMMAR,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123'
            };

            const apiRequest = requestBuilder.buildCorrectionRequest(request, 1500, 0.7);

            expect(apiRequest.model).toBe('gpt-3.5-turbo');
            expect(apiRequest.max_tokens).toBe(1500);
            expect(apiRequest.temperature).toBe(0.7);
            expect(apiRequest.messages).toHaveLength(2);
            expect(apiRequest.messages[0].role).toBe('system');
            expect(apiRequest.messages[1].role).toBe('user');
        });

        test('should include custom prompt in user message when provided', () => {
            const customPrompt = 'Please focus on formal tone';
            const text = 'Hey there, how are you doing?';
            
            const request: CorrectionRequest = {
                text,
                prompt: customPrompt,
                correctionType: CorrectionType.TONE,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123'
            };

            const apiRequest = requestBuilder.buildCorrectionRequest(request, 1000, 0.3);
            const userMessage = apiRequest.messages[1].content;

            expect(userMessage).toContain(customPrompt);
            expect(userMessage).toContain(text);
        });

        test('should use default prompt format when no custom prompt provided', () => {
            const text = 'This needs correction.';
            
            const request: CorrectionRequest = {
                text,
                prompt: '',
                correctionType: CorrectionType.GRAMMAR,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123'
            };

            const apiRequest = requestBuilder.buildCorrectionRequest(request, 1000, 0.3);
            const userMessage = apiRequest.messages[1].content;

            expect(userMessage).toContain('Please improve the following text:');
            expect(userMessage).toContain(text);
        });
    });
});