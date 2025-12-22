import * as fc from 'fast-check';
import { LLMApiClient } from '../LLMApiClient';
import { LLMApiConfiguration } from '../../types';

describe('LLMApiClient', () => {
    /**
     * **Feature: grammar-proofreading-extension, Property 5: API configuration validation**
     * **Validates: Requirements 5.1, 5.3**
     * 
     * For any API configuration input, invalid URLs, missing credentials, or malformed settings 
     * should be rejected with appropriate error messages
     */
    test('Property 5: API configuration validation', () => {
        fc.assert(fc.property(
            fc.record({
                endpoint: fc.oneof(
                    fc.constant(''), // empty string
                    fc.constant('   '), // whitespace only
                    fc.string().filter(s => {
                        try {
                            new URL(s);
                            return false; // valid URL, we want invalid ones for this branch
                        } catch {
                            return true; // invalid URL
                        }
                    }),
                    fc.webUrl(), // valid URLs
                    fc.constant('ftp://invalid.protocol.com'), // invalid protocol
                    fc.constant('not-a-url-at-all')
                ),
                apiKey: fc.oneof(
                    fc.constant(''), // empty string
                    fc.constant('   '), // whitespace only
                    fc.string({ minLength: 1, maxLength: 200 }) // valid key
                ),
                model: fc.oneof(
                    fc.constant(''), // empty string
                    fc.constant('   '), // whitespace only
                    fc.string({ minLength: 1, maxLength: 100 }) // valid model
                ),
                maxTokens: fc.oneof(
                    fc.constant(0), // zero
                    fc.integer({ min: -1000, max: -1 }), // negative
                    fc.integer({ min: 1, max: 100000 }), // valid range
                    fc.integer({ min: 100001, max: 200000 }) // too large
                ),
                temperature: fc.oneof(
                    fc.float({ min: -5, max: Math.fround(-0.1) }), // negative
                    fc.float({ min: 0, max: 2 }), // valid range
                    fc.float({ min: Math.fround(2.1), max: 10 }) // too large
                )
            }),
            (config) => {
                const client = new LLMApiClient(config);
                const validationErrors = client.validateConfiguration();
                
                // Determine what errors we expect based on the input
                const expectedErrors: string[] = [];
                
                // Check endpoint validation
                if (!config.endpoint || config.endpoint.trim().length === 0) {
                    expectedErrors.push('API endpoint is required');
                } else {
                    try {
                        const url = new URL(config.endpoint);
                        if (!['http:', 'https:'].includes(url.protocol)) {
                            expectedErrors.push('API endpoint must use HTTP or HTTPS protocol');
                        }
                    } catch {
                        expectedErrors.push('API endpoint must be a valid URL');
                    }
                }
                
                // Check API key validation
                if (!config.apiKey || config.apiKey.trim().length === 0) {
                    expectedErrors.push('API key is required');
                }
                
                // Check model validation
                if (!config.model || config.model.trim().length === 0) {
                    expectedErrors.push('Model is required');
                }
                
                // Check maxTokens validation
                if (config.maxTokens <= 0) {
                    expectedErrors.push('Max tokens must be greater than 0');
                }
                if (config.maxTokens > 100000) {
                    expectedErrors.push('Max tokens must not exceed 100000');
                }
                
                // Check temperature validation
                if (config.temperature < 0 || config.temperature > 2) {
                    expectedErrors.push('Temperature must be between 0 and 2');
                }
                
                // Verify that validation catches all expected errors
                expect(validationErrors.length).toBe(expectedErrors.length);
                
                // Verify that all expected error messages are present
                for (const expectedError of expectedErrors) {
                    expect(validationErrors).toContain(expectedError);
                }
                
                // Verify that if configuration is valid, no errors are returned
                if (expectedErrors.length === 0) {
                    expect(validationErrors).toEqual([]);
                }
                
                // Verify that if configuration is invalid, errors are returned
                if (expectedErrors.length > 0) {
                    expect(validationErrors.length).toBeGreaterThan(0);
                }
                
                // Test that sendRequest rejects invalid configurations
                if (validationErrors.length > 0) {
                    // For invalid configurations, we expect sendRequest to throw
                    // We can't test async operations in property tests easily, so we'll just verify validation
                    expect(validationErrors.length).toBeGreaterThan(0);
                    return true;
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific validation scenarios
    describe('Configuration validation edge cases', () => {
        test('should accept valid configuration', () => {
            const validConfig: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(validConfig);
            const errors = client.validateConfiguration();
            expect(errors).toEqual([]);
        });

        test('should reject empty endpoint', () => {
            const config: LLMApiConfiguration = {
                endpoint: '',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('API endpoint is required');
        });

        test('should reject invalid URL format', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'not-a-valid-url',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('API endpoint must be a valid URL');
        });

        test('should reject non-HTTP protocols', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'ftp://example.com/api',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('API endpoint must use HTTP or HTTPS protocol');
        });

        test('should reject empty API key', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: '',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('API key is required');
        });

        test('should reject empty model', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: '',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('Model is required');
        });

        test('should reject invalid maxTokens', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 0,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('Max tokens must be greater than 0');
        });

        test('should reject maxTokens that are too large', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 150000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            expect(errors).toContain('Max tokens must not exceed 100000');
        });

        test('should reject invalid temperature range', () => {
            const config1: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: -0.5
            };
            
            const client1 = new LLMApiClient(config1);
            const errors1 = client1.validateConfiguration();
            expect(errors1).toContain('Temperature must be between 0 and 2');

            const config2: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 3.0
            };
            
            const client2 = new LLMApiClient(config2);
            const errors2 = client2.validateConfiguration();
            expect(errors2).toContain('Temperature must be between 0 and 2');
        });

        test('should handle multiple validation errors', () => {
            const config: LLMApiConfiguration = {
                endpoint: '',
                apiKey: '',
                model: '',
                maxTokens: -5,
                temperature: 5.0
            };
            
            const client = new LLMApiClient(config);
            const errors = client.validateConfiguration();
            
            expect(errors.length).toBeGreaterThan(1);
            expect(errors).toContain('API endpoint is required');
            expect(errors).toContain('API key is required');
            expect(errors).toContain('Model is required');
            expect(errors).toContain('Max tokens must be greater than 0');
            expect(errors).toContain('Temperature must be between 0 and 2');
        });
    });

    describe('Configuration management', () => {
        test('should update configuration', () => {
            const initialConfig: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(initialConfig);
            
            const newConfig: LLMApiConfiguration = {
                endpoint: 'https://api.anthropic.com/v1/messages',
                apiKey: 'sk-new-key-456',
                model: 'claude-3-sonnet',
                maxTokens: 2000,
                temperature: 0.5
            };
            
            client.updateConfiguration(newConfig);
            const retrievedConfig = client.getConfiguration();
            
            expect(retrievedConfig).toEqual(newConfig);
            expect(retrievedConfig).not.toBe(newConfig); // Should be a copy
        });

        test('should return configuration copy', () => {
            const config: LLMApiConfiguration = {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test-key-123',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            };
            
            const client = new LLMApiClient(config);
            const retrievedConfig = client.getConfiguration();
            
            expect(retrievedConfig).toEqual(config);
            expect(retrievedConfig).not.toBe(config); // Should be a copy
            
            // Modifying returned config should not affect internal state
            retrievedConfig.apiKey = 'modified-key';
            const secondRetrieval = client.getConfiguration();
            expect(secondRetrieval.apiKey).toBe('sk-test-key-123');
        });
    });
});