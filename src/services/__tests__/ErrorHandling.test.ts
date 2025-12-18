import * as fc from 'fast-check';
import { ResponseParser, APIResponse } from '../ResponseParser';

describe('Error Handling', () => {
    let responseParser: ResponseParser;

    beforeEach(() => {
        responseParser = new ResponseParser();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 14: Malformed JSON is handled gracefully
         * Validates: Requirements 4.5
         */
        test('should handle malformed JSON responses gracefully', () => {
            // Generator for malformed JSON strings
            const malformedJsonArb = fc.oneof(
                fc.constant('not json at all'),
                fc.constant('{"incomplete": '),
                fc.constant('{"invalid": "json"'),
                fc.constant('[1,2,3,]'),
                fc.constant('{"nested": {"broken": }'),
                fc.constant('undefined'),
                fc.constant('null'),
                fc.constant(''),
                fc.string().filter(s => {
                    try {
                        JSON.parse(s);
                        return false; // If it parses successfully, we don't want it
                    } catch {
                        return true; // If it fails to parse, it's what we want
                    }
                })
            );

            fc.assert(
                fc.property(malformedJsonArb, (malformedJson) => {
                    const apiResponse: APIResponse = {
                        choices: [{
                            message: {
                                content: malformedJson
                            }
                        }]
                    };

                    const result = responseParser.parseResponse(apiResponse);
                    
                    // Should handle the error gracefully without throwing
                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                    expect(result.data).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 11: Validation failures are logged and reported
         * Validates: Requirements 4.2
         */
        test('should report validation failures with descriptive errors', () => {
            // Generator for JSON that parses but fails validation
            const invalidButParsableArb = fc.oneof(
                // Missing required fields
                fc.record({
                    explanation: fc.string()
                    // Missing correctedText
                }),
                fc.record({
                    correctedText: fc.string()
                    // Missing explanation
                }),
                // Invalid field types
                fc.record({
                    correctedText: fc.integer(), // Should be string
                    explanation: fc.string()
                }),
                fc.record({
                    correctedText: fc.string(),
                    explanation: fc.boolean() // Should be string
                }),
                // Invalid confidence values
                fc.record({
                    correctedText: fc.string(),
                    explanation: fc.string(),
                    confidence: fc.oneof(
                        fc.float({ min: Math.fround(-10), max: Math.fround(-0.1) }),
                        fc.float({ min: Math.fround(1.1), max: Math.fround(10) })
                    )
                })
            );

            fc.assert(
                fc.property(invalidButParsableArb, (invalidData) => {
                    const apiResponse: APIResponse = {
                        choices: [{
                            message: {
                                content: JSON.stringify(invalidData)
                            }
                        }]
                    };

                    const result = responseParser.parseResponse(apiResponse);
                    
                    // Should fail validation but handle it gracefully
                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    expect(result.error).toContain('Invalid response format');
                    expect(result.data).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });

        test('should handle various malformed response structures', () => {
            // Generator for malformed API response structures
            const malformedResponseArb = fc.oneof(
                // Missing choices
                fc.record({}),
                // Null choices
                fc.record({ choices: fc.constant(null) }),
                // Empty choices array
                fc.record({ choices: fc.constant([]) }),
                // Choices with missing message
                fc.record({ choices: fc.array(fc.record({}), { minLength: 1 }) }),
                // Choices with null message
                fc.record({ choices: fc.array(fc.record({ message: fc.constant(null) }), { minLength: 1 }) }),
                // Choices with missing content
                fc.record({ choices: fc.array(fc.record({ message: fc.record({}) }), { minLength: 1 }) })
            );

            fc.assert(
                fc.property(malformedResponseArb, (malformedResponse) => {
                    const result = responseParser.parseResponse(malformedResponse as APIResponse);
                    
                    // Should handle malformed responses gracefully
                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');
                    expect(result.data).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should handle empty API response choices', () => {
            const apiResponse: APIResponse = {
                choices: []
            };

            const result = responseParser.parseResponse(apiResponse);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No response choices available');
        });

        test('should handle missing API response choices', () => {
            const apiResponse = {} as APIResponse;

            const result = responseParser.parseResponse(apiResponse);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No response choices available');
        });

        test('should handle empty message content', () => {
            const apiResponse: APIResponse = {
                choices: [{
                    message: {
                        content: ''
                    }
                }]
            };

            const result = responseParser.parseResponse(apiResponse);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Empty response content');
        });

        test('should extract JSON from response with extra text', () => {
            const validJson = {
                correctedText: 'Corrected text',
                explanation: 'This is an explanation'
            };
            
            const responseWithExtraText = `Here is the corrected text: ${JSON.stringify(validJson)} Hope this helps!`;
            
            const apiResponse: APIResponse = {
                choices: [{
                    message: {
                        content: responseWithExtraText
                    }
                }]
            };

            const result = responseParser.parseResponse(apiResponse);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validJson);
        });

        test('should handle parsing errors gracefully', () => {
            // Test that parsing errors don't crash the application
            const originalParse = JSON.parse;
            JSON.parse = jest.fn().mockImplementation(() => {
                throw new Error('Simulated parsing error');
            });

            const apiResponse: APIResponse = {
                choices: [{
                    message: {
                        content: '{"valid": "json"}'
                    }
                }]
            };

            const result = responseParser.parseResponse(apiResponse);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to parse JSON response');

            // Restore original JSON.parse
            JSON.parse = originalParse;
        });
    });
});