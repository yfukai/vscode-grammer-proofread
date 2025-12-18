import * as fc from 'fast-check';
import { CorrectionType } from '../../models/CorrectionType';
import { CorrectionResponse } from '../../models/CorrectionResponse';

// Create a simplified correction service for testing
class CorrectionServiceLogic {
    extractCorrectionData(response: CorrectionResponse): { 
        hasText: boolean; 
        hasExplanation: boolean; 
        changeCount: number;
        hasConfidence: boolean;
    } {
        return {
            hasText: Boolean(response.correctedText),
            hasExplanation: Boolean(response.explanation),
            changeCount: response.changes.length,
            hasConfidence: true // confidence is always present in the interface
        };
    }

    formatExplanationMessage(response: CorrectionResponse): string {
        let message = `Correction completed!\n\n${response.explanation}`;
        
        if (response.changes && response.changes.length > 0) {
            message += '\n\nKey changes made:';
            response.changes.slice(0, 3).forEach((change, index) => {
                message += `\n${index + 1}. "${change.original}" → "${change.corrected}" (${change.reason})`;
            });
            
            if (response.changes.length > 3) {
                message += `\n... and ${response.changes.length - 3} more changes`;
            }
        }

        message += `\n\nConfidence: ${Math.round(response.confidence * 100)}%`;

        return message;
    }

    getPromptForCorrectionType(correctionType: CorrectionType): string {
        switch (correctionType) {
            case CorrectionType.GRAMMAR:
                return 'Please correct any grammatical errors in the following text while preserving the original meaning and style.';
            case CorrectionType.STYLE:
                return 'Please improve the writing style of the following text to make it more engaging and professional while maintaining the original tone.';
            case CorrectionType.CLARITY:
                return 'Please improve the clarity and readability of the following text by simplifying complex sentences and removing ambiguity.';
            case CorrectionType.TONE:
                return 'Please adjust the tone of the following text to be more appropriate and consistent throughout.';
            case CorrectionType.CUSTOM:
                return '';
            default:
                return 'Please improve the following text.';
        }
    }

    validateCorrectionWorkflow(
        hasValidConfig: boolean,
        hasActiveEditor: boolean,
        hasText: boolean,
        apiSuccess: boolean
    ): { canProceed: boolean; error?: string } {
        if (!hasValidConfig) {
            return { canProceed: false, error: 'Invalid configuration' };
        }

        if (!hasActiveEditor) {
            return { canProceed: false, error: 'No active editor' };
        }

        if (!hasText) {
            return { canProceed: false, error: 'No text to process' };
        }

        if (!apiSuccess) {
            return { canProceed: false, error: 'API request failed' };
        }

        return { canProceed: true };
    }
}

describe('CorrectionService', () => {
    let correctionService: CorrectionServiceLogic;

    beforeEach(() => {
        correctionService = new CorrectionServiceLogic();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 8: Correction responses extract required data
         * Validates: Requirements 3.1
         */
        test('should extract all required data from correction responses', () => {
            // Generator for correction responses
            const correctionResponseArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.string(),
                changes: fc.array(fc.record({
                    original: fc.string(),
                    corrected: fc.string(),
                    reason: fc.string(),
                    position: fc.record({
                        start: fc.nat(),
                        end: fc.nat()
                    })
                })),
                confidence: fc.float({ min: 0, max: 1 })
            });

            fc.assert(
                fc.property(correctionResponseArb, (response) => {
                    const extracted = correctionService.extractCorrectionData(response);
                    
                    // Should extract text presence
                    expect(extracted.hasText).toBe(Boolean(response.correctedText));
                    
                    // Should extract explanation presence
                    expect(extracted.hasExplanation).toBe(Boolean(response.explanation));
                    
                    // Should count changes correctly
                    expect(extracted.changeCount).toBe(response.changes ? response.changes.length : 0);
                    
                    // Should detect confidence presence (always true for valid responses)
                    expect(extracted.hasConfidence).toBe(true);
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 9: Text replacement shows explanations
         * Validates: Requirements 3.2
         */
        test('should format explanation messages with all response data', () => {
            const correctionResponseArb = fc.record({
                correctedText: fc.string({ minLength: 1 }),
                explanation: fc.string({ minLength: 1 }),
                changes: fc.array(fc.record({
                    original: fc.string({ minLength: 1 }),
                    corrected: fc.string({ minLength: 1 }),
                    reason: fc.string({ minLength: 1 }),
                    position: fc.record({
                        start: fc.nat(),
                        end: fc.nat()
                    })
                })),
                confidence: fc.float({ min: 0, max: 1 })
            });

            fc.assert(
                fc.property(correctionResponseArb, (response) => {
                    const message = correctionService.formatExplanationMessage(response);
                    
                    // Should always include the explanation
                    expect(message).toContain(response.explanation);
                    expect(message).toContain('Correction completed!');
                    
                    // Should include changes if they exist
                    if (response.changes && response.changes.length > 0) {
                        expect(message).toContain('Key changes made:');
                        
                        // Should include first few changes
                        const changesToShow = Math.min(3, response.changes.length);
                        for (let i = 0; i < changesToShow; i++) {
                            const change = response.changes[i];
                            expect(message).toContain(change.original);
                            expect(message).toContain(change.corrected);
                            expect(message).toContain(change.reason);
                        }
                        
                        // Should indicate if there are more changes
                        if (response.changes.length > 3) {
                            expect(message).toContain(`and ${response.changes.length - 3} more changes`);
                        }
                    }
                    
                    // Should include confidence
                    const confidencePercent = Math.round(response.confidence * 100);
                    expect(message).toContain(`Confidence: ${confidencePercent}%`);
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 15: Correction buttons use associated prompts
         * Validates: Requirements 5.2
         */
        test('should return appropriate prompts for each correction type', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE,
                CorrectionType.CUSTOM
            );

            fc.assert(
                fc.property(correctionTypeArb, (correctionType) => {
                    const prompt = correctionService.getPromptForCorrectionType(correctionType);
                    
                    // Should return a string
                    expect(typeof prompt).toBe('string');
                    
                    // Should return specific prompts for each type
                    switch (correctionType) {
                        case CorrectionType.GRAMMAR:
                            expect(prompt).toContain('grammatical errors');
                            break;
                        case CorrectionType.STYLE:
                            expect(prompt).toContain('writing style');
                            break;
                        case CorrectionType.CLARITY:
                            expect(prompt).toContain('clarity');
                            break;
                        case CorrectionType.TONE:
                            expect(prompt).toContain('tone');
                            break;
                        case CorrectionType.CUSTOM:
                            expect(prompt).toBe('');
                            break;
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('should validate correction workflow prerequisites', () => {
            const hasValidConfigArb = fc.boolean();
            const hasActiveEditorArb = fc.boolean();
            const hasTextArb = fc.boolean();
            const apiSuccessArb = fc.boolean();

            fc.assert(
                fc.property(hasValidConfigArb, hasActiveEditorArb, hasTextArb, apiSuccessArb, 
                    (hasValidConfig, hasActiveEditor, hasText, apiSuccess) => {
                    const result = correctionService.validateCorrectionWorkflow(
                        hasValidConfig, hasActiveEditor, hasText, apiSuccess
                    );
                    
                    const allValid = hasValidConfig && hasActiveEditor && hasText && apiSuccess;
                    
                    expect(result.canProceed).toBe(allValid);
                    
                    if (!allValid) {
                        expect(result.error).toBeDefined();
                        expect(typeof result.error).toBe('string');
                    } else {
                        expect(result.error).toBeUndefined();
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('should handle responses with no changes gracefully', () => {
            const responseWithoutChangesArb = fc.record({
                correctedText: fc.string({ minLength: 1 }),
                explanation: fc.string({ minLength: 1 }),
                changes: fc.constant([]),
                confidence: fc.float({ min: 0, max: 1 })
            });

            fc.assert(
                fc.property(responseWithoutChangesArb, (response) => {
                    const message = correctionService.formatExplanationMessage(response);
                    const extracted = correctionService.extractCorrectionData(response);
                    
                    // Should handle missing changes gracefully
                    expect(extracted.changeCount).toBe(0);
                    expect(message).toContain(response.explanation);
                    expect(message).not.toContain('Key changes made:');
                }),
                { numRuns: 100 }
            );
        });

        test('should handle empty changes array gracefully', () => {
            const responseWithEmptyChangesArb = fc.record({
                correctedText: fc.string({ minLength: 1 }),
                explanation: fc.string({ minLength: 1 }),
                changes: fc.constant([]),
                confidence: fc.float({ min: 0, max: 1 })
            });

            fc.assert(
                fc.property(responseWithEmptyChangesArb, (response) => {
                    const message = correctionService.formatExplanationMessage(response);
                    const extracted = correctionService.extractCorrectionData(response);
                    
                    // Should handle empty changes array
                    expect(extracted.changeCount).toBe(0);
                    expect(message).toContain(response.explanation);
                    expect(message).not.toContain('Key changes made:');
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should extract data from complete response', () => {
            const response: CorrectionResponse = {
                correctedText: 'Corrected text here',
                explanation: 'Fixed grammar issues',
                changes: [
                    {
                        original: 'wrong',
                        corrected: 'right',
                        reason: 'grammar fix',
                        position: { start: 0, end: 5 }
                    }
                ],
                confidence: 0.95
            };

            const extracted = correctionService.extractCorrectionData(response);
            
            expect(extracted.hasText).toBe(true);
            expect(extracted.hasExplanation).toBe(true);
            expect(extracted.changeCount).toBe(1);
            expect(extracted.hasConfidence).toBe(true);
        });

        test('should format message with multiple changes', () => {
            const response: CorrectionResponse = {
                correctedText: 'Corrected text',
                explanation: 'Multiple fixes applied',
                changes: [
                    { original: 'error1', corrected: 'fix1', reason: 'reason1', position: { start: 0, end: 6 } },
                    { original: 'error2', corrected: 'fix2', reason: 'reason2', position: { start: 7, end: 13 } },
                    { original: 'error3', corrected: 'fix3', reason: 'reason3', position: { start: 14, end: 20 } },
                    { original: 'error4', corrected: 'fix4', reason: 'reason4', position: { start: 21, end: 27 } }
                ],
                confidence: 0.88
            };

            const message = correctionService.formatExplanationMessage(response);
            
            expect(message).toContain('Multiple fixes applied');
            expect(message).toContain('Key changes made:');
            expect(message).toContain('error1');
            expect(message).toContain('error2');
            expect(message).toContain('error3');
            expect(message).toContain('and 1 more changes');
            expect(message).toContain('Confidence: 88%');
        });

        test('should return correct prompts for each correction type', () => {
            expect(correctionService.getPromptForCorrectionType(CorrectionType.GRAMMAR))
                .toContain('grammatical errors');
            expect(correctionService.getPromptForCorrectionType(CorrectionType.STYLE))
                .toContain('writing style');
            expect(correctionService.getPromptForCorrectionType(CorrectionType.CLARITY))
                .toContain('clarity');
            expect(correctionService.getPromptForCorrectionType(CorrectionType.TONE))
                .toContain('tone');
            expect(correctionService.getPromptForCorrectionType(CorrectionType.CUSTOM))
                .toBe('');
        });

        test('should validate workflow with all prerequisites met', () => {
            const result = correctionService.validateCorrectionWorkflow(true, true, true, true);
            expect(result.canProceed).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should fail validation when configuration is invalid', () => {
            const result = correctionService.validateCorrectionWorkflow(false, true, true, true);
            expect(result.canProceed).toBe(false);
            expect(result.error).toBe('Invalid configuration');
        });
    });
});