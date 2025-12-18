import * as fc from 'fast-check';
import { CorrectionResponse } from '../../models/CorrectionResponse';
import { CorrectionType } from '../../models/CorrectionType';

// Create a simplified user feedback manager for testing
class UserFeedbackLogic {
    formatMultipleCorrectionsExplanation(response: CorrectionResponse): {
        hasIndividualExplanations: boolean;
        explanationCount: number;
        totalMessage: string;
    } {
        let message = response.explanation;
        let explanationCount = 1; // Base explanation
        
        if (response.changes && response.changes.length > 0) {
            message += '\n\nIndividual changes:';
            response.changes.forEach((change, index) => {
                message += `\n${index + 1}. "${change.original}" → "${change.corrected}" (${change.reason})`;
                explanationCount++;
            });
        }

        return {
            hasIndividualExplanations: response.changes && response.changes.length > 0,
            explanationCount,
            totalMessage: message
        };
    }

    generateCorrectionTypeLabel(correctionType: CorrectionType): {
        label: string;
        isClear: boolean;
        hasIcon: boolean;
        description: string;
    } {
        const labels = {
            [CorrectionType.GRAMMAR]: {
                label: '📝 Grammar',
                description: 'Fix grammatical errors and improve sentence structure'
            },
            [CorrectionType.STYLE]: {
                label: '✨ Style',
                description: 'Enhance writing style and word choice'
            },
            [CorrectionType.CLARITY]: {
                label: '🔍 Clarity',
                description: 'Improve readability and remove ambiguity'
            },
            [CorrectionType.TONE]: {
                label: '🎭 Tone',
                description: 'Adjust tone and formality level'
            },
            [CorrectionType.CUSTOM]: {
                label: '⚙️ Custom',
                description: 'Apply custom correction instructions'
            }
        };

        const config = labels[correctionType] || {
            label: '📄 General',
            description: 'General text improvement'
        };

        return {
            label: config.label,
            isClear: config.label.length > 0 && config.description.length > 0,
            hasIcon: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(config.label),
            description: config.description
        };
    }

    validateFeedbackQuality(response: CorrectionResponse): {
        hasExplanation: boolean;
        hasChanges: boolean;
        hasConfidence: boolean;
        isComplete: boolean;
        qualityScore: number;
    } {
        const hasExplanation = Boolean(response.explanation && response.explanation.trim().length > 0);
        const hasChanges = Boolean(response.changes && response.changes.length > 0);
        const hasConfidence = Boolean(response.confidence !== undefined && response.confidence >= 0 && response.confidence <= 1);
        
        let qualityScore = 0;
        if (hasExplanation) qualityScore += 0.4;
        if (hasChanges) qualityScore += 0.3;
        if (hasConfidence) qualityScore += 0.3;
        
        return {
            hasExplanation,
            hasChanges,
            hasConfidence,
            isComplete: hasExplanation && hasConfidence,
            qualityScore
        };
    }

    formatProgressMessage(step: string, progress: number): {
        message: string;
        hasProgress: boolean;
        isValidProgress: boolean;
    } {
        const isValidProgress = progress >= 0 && progress <= 100;
        const message = `${step}... ${progress}%`;
        
        return {
            message,
            hasProgress: progress > 0,
            isValidProgress
        };
    }

    categorizeUserAction(action: string): {
        category: 'correction' | 'settings' | 'help' | 'unknown';
        isValid: boolean;
        requiresConfirmation: boolean;
    } {
        const correctionActions = ['grammar', 'style', 'clarity', 'tone', 'custom'];
        const settingsActions = ['opensettings', 'configure', 'apikey'];
        const helpActions = ['help', 'about', 'documentation'];
        
        let category: 'correction' | 'settings' | 'help' | 'unknown' = 'unknown';
        let requiresConfirmation = false;
        
        if (correctionActions.some(a => action.toLowerCase().includes(a))) {
            category = 'correction';
            requiresConfirmation = true;
        } else if (settingsActions.some(a => action.toLowerCase().includes(a))) {
            category = 'settings';
            requiresConfirmation = false;
        } else if (helpActions.some(a => action.toLowerCase().includes(a))) {
            category = 'help';
            requiresConfirmation = false;
        }
        
        return {
            category,
            isValid: category !== 'unknown',
            requiresConfirmation
        };
    }
}

describe('User Feedback', () => {
    let userFeedback: UserFeedbackLogic;

    beforeEach(() => {
        userFeedback = new UserFeedbackLogic();
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 10: Multiple corrections provide individual explanations
         * Validates: Requirements 3.3
         */
        test('should provide individual explanations for multiple corrections', () => {
            // Generator for responses with multiple changes
            const multipleChangesResponseArb = fc.record({
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
                }), { minLength: 1, maxLength: 10 }),
                confidence: fc.float({ min: 0, max: 1 })
            });

            fc.assert(
                fc.property(multipleChangesResponseArb, (response) => {
                    const feedback = userFeedback.formatMultipleCorrectionsExplanation(response);
                    
                    // Should have individual explanations when there are changes
                    expect(feedback.hasIndividualExplanations).toBe(true);
                    
                    // Should have at least as many explanations as changes + 1 (base explanation)
                    expect(feedback.explanationCount).toBeGreaterThanOrEqual(response.changes.length + 1);
                    
                    // Should include all change reasons in the message
                    response.changes.forEach(change => {
                        expect(feedback.totalMessage).toContain(change.original);
                        expect(feedback.totalMessage).toContain(change.corrected);
                        expect(feedback.totalMessage).toContain(change.reason);
                    });
                    
                    // Should include the base explanation
                    expect(feedback.totalMessage).toContain(response.explanation);
                }),
                { numRuns: 100 }
            );
        });

        /**
         * Feature: grammar-proofreading-extension, Property 17: Correction types have clear labels
         * Validates: Requirements 5.4
         */
        test('should generate clear labels for all correction types', () => {
            const correctionTypeArb = fc.constantFrom(
                CorrectionType.GRAMMAR,
                CorrectionType.STYLE,
                CorrectionType.CLARITY,
                CorrectionType.TONE,
                CorrectionType.CUSTOM
            );

            fc.assert(
                fc.property(correctionTypeArb, (correctionType) => {
                    const labelInfo = userFeedback.generateCorrectionTypeLabel(correctionType);
                    
                    // Should have a clear, non-empty label
                    expect(labelInfo.isClear).toBe(true);
                    expect(labelInfo.label.length).toBeGreaterThan(0);
                    expect(labelInfo.description.length).toBeGreaterThan(0);
                    
                    // Should have an icon for visual clarity
                    expect(labelInfo.hasIcon).toBe(true);
                    
                    // Label should be descriptive of the correction type
                    const lowerLabel = labelInfo.label.toLowerCase();
                    const lowerType = correctionType.toLowerCase();
                    
                    if (correctionType !== CorrectionType.CUSTOM) {
                        expect(lowerLabel).toContain(lowerType);
                    }
                }),
                { numRuns: 100 }
            );
        });

        test('should validate feedback quality consistently', () => {
            // Generator for various response qualities
            const responseArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.oneof(
                    fc.string({ minLength: 1 }),
                    fc.constant(''),
                    fc.string().filter(s => s.trim() === '')
                ),
                changes: fc.oneof(
                    fc.array(fc.record({
                        original: fc.string(),
                        corrected: fc.string(),
                        reason: fc.string(),
                        position: fc.record({
                            start: fc.nat(),
                            end: fc.nat()
                        })
                    })),
                    fc.constant([])
                ),
                confidence: fc.oneof(
                    fc.float({ min: 0, max: 1 }),
                    fc.float({ min: Math.fround(-1), max: Math.fround(-0.1) }),
                    fc.float({ min: Math.fround(1.1), max: Math.fround(2) })
                )
            });

            fc.assert(
                fc.property(responseArb, (response) => {
                    const quality = userFeedback.validateFeedbackQuality(response);
                    
                    // Quality score should be between 0 and 1
                    expect(quality.qualityScore).toBeGreaterThanOrEqual(0);
                    expect(quality.qualityScore).toBeLessThanOrEqual(1);
                    
                    // Should correctly identify explanation presence
                    const hasValidExplanation = Boolean(response.explanation && response.explanation.trim().length > 0);
                    expect(quality.hasExplanation).toBe(hasValidExplanation);
                    
                    // Should correctly identify changes presence
                    const hasValidChanges = Boolean(response.changes && response.changes.length > 0);
                    expect(quality.hasChanges).toBe(hasValidChanges);
                    
                    // Should correctly identify valid confidence
                    const hasValidConfidence = Boolean(response.confidence !== undefined && 
                                             response.confidence >= 0 && 
                                             response.confidence <= 1);
                    expect(quality.hasConfidence).toBe(hasValidConfidence);
                    
                    // Complete feedback requires explanation and confidence
                    expect(quality.isComplete).toBe(quality.hasExplanation && quality.hasConfidence);
                }),
                { numRuns: 100 }
            );
        });

        test('should format progress messages correctly', () => {
            const stepArb = fc.string({ minLength: 1 });
            const progressArb = fc.integer({ min: -10, max: 110 });

            fc.assert(
                fc.property(stepArb, progressArb, (step, progress) => {
                    const progressInfo = userFeedback.formatProgressMessage(step, progress);
                    
                    // Should always include the step and progress
                    expect(progressInfo.message).toContain(step);
                    expect(progressInfo.message).toContain(`${progress}%`);
                    
                    // Should correctly identify if there's progress
                    expect(progressInfo.hasProgress).toBe(progress > 0);
                    
                    // Should validate progress range
                    expect(progressInfo.isValidProgress).toBe(progress >= 0 && progress <= 100);
                }),
                { numRuns: 100 }
            );
        });

        test('should categorize user actions correctly', () => {
            const actionArb = fc.oneof(
                fc.constantFrom('grammar', 'style', 'clarity', 'tone', 'custom'),
                fc.constantFrom('opensettings', 'configure', 'apikey'),
                fc.constantFrom('help', 'about', 'documentation'),
                fc.string().filter(s => !['grammar', 'style', 'clarity', 'tone', 'custom', 
                                         'opensettings', 'configure', 'apikey', 
                                         'help', 'about', 'documentation'].some(a => s.toLowerCase().includes(a)))
            );

            fc.assert(
                fc.property(actionArb, (action) => {
                    const categorization = userFeedback.categorizeUserAction(action);
                    
                    // Should have a valid category
                    expect(['correction', 'settings', 'help', 'unknown']).toContain(categorization.category);
                    
                    // Should be valid if not unknown
                    expect(categorization.isValid).toBe(categorization.category !== 'unknown');
                    
                    // Correction actions should require confirmation
                    if (categorization.category === 'correction') {
                        expect(categorization.requiresConfirmation).toBe(true);
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
                    const feedback = userFeedback.formatMultipleCorrectionsExplanation(response);
                    
                    // Should not have individual explanations when no changes
                    expect(feedback.hasIndividualExplanations).toBe(false);
                    
                    // Should still have the base explanation
                    expect(feedback.explanationCount).toBe(1);
                    expect(feedback.totalMessage).toContain(response.explanation);
                    expect(feedback.totalMessage).not.toContain('Individual changes:');
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Unit Tests', () => {
        test('should format multiple corrections with individual explanations', () => {
            const response: CorrectionResponse = {
                correctedText: 'Corrected text',
                explanation: 'Fixed multiple issues',
                changes: [
                    { original: 'wrong1', corrected: 'right1', reason: 'grammar', position: { start: 0, end: 6 } },
                    { original: 'wrong2', corrected: 'right2', reason: 'style', position: { start: 7, end: 13 } }
                ],
                confidence: 0.9
            };

            const feedback = userFeedback.formatMultipleCorrectionsExplanation(response);
            
            expect(feedback.hasIndividualExplanations).toBe(true);
            expect(feedback.explanationCount).toBe(3); // base + 2 changes
            expect(feedback.totalMessage).toContain('Fixed multiple issues');
            expect(feedback.totalMessage).toContain('Individual changes:');
            expect(feedback.totalMessage).toContain('wrong1');
            expect(feedback.totalMessage).toContain('right1');
            expect(feedback.totalMessage).toContain('grammar');
        });

        test('should generate clear labels for each correction type', () => {
            const grammarLabel = userFeedback.generateCorrectionTypeLabel(CorrectionType.GRAMMAR);
            expect(grammarLabel.isClear).toBe(true);
            expect(grammarLabel.hasIcon).toBe(true);
            expect(grammarLabel.label.toLowerCase()).toContain('grammar');

            const styleLabel = userFeedback.generateCorrectionTypeLabel(CorrectionType.STYLE);
            expect(styleLabel.isClear).toBe(true);
            expect(styleLabel.hasIcon).toBe(true);
            expect(styleLabel.label.toLowerCase()).toContain('style');
        });

        test('should validate high quality feedback', () => {
            const highQualityResponse: CorrectionResponse = {
                correctedText: 'Great text',
                explanation: 'Comprehensive explanation of changes',
                changes: [
                    { original: 'bad', corrected: 'good', reason: 'improvement', position: { start: 0, end: 3 } }
                ],
                confidence: 0.95
            };

            const quality = userFeedback.validateFeedbackQuality(highQualityResponse);
            
            expect(quality.hasExplanation).toBe(true);
            expect(quality.hasChanges).toBe(true);
            expect(quality.hasConfidence).toBe(true);
            expect(quality.isComplete).toBe(true);
            expect(quality.qualityScore).toBe(1.0);
        });

        test('should validate low quality feedback', () => {
            const lowQualityResponse: CorrectionResponse = {
                correctedText: 'Text',
                explanation: '',
                changes: [],
                confidence: 0.5
            };

            const quality = userFeedback.validateFeedbackQuality(lowQualityResponse);
            
            expect(quality.hasExplanation).toBe(false);
            expect(quality.hasChanges).toBe(false);
            expect(quality.hasConfidence).toBe(true);
            expect(quality.isComplete).toBe(false);
            expect(quality.qualityScore).toBe(0.3); // Only confidence
        });

        test('should format progress messages', () => {
            const progress = userFeedback.formatProgressMessage('Processing', 75);
            
            expect(progress.message).toBe('Processing... 75%');
            expect(progress.hasProgress).toBe(true);
            expect(progress.isValidProgress).toBe(true);
        });

        test('should categorize correction actions', () => {
            const grammarAction = userFeedback.categorizeUserAction('correctGrammar');
            expect(grammarAction.category).toBe('correction');
            expect(grammarAction.isValid).toBe(true);
            expect(grammarAction.requiresConfirmation).toBe(true);

            const settingsAction = userFeedback.categorizeUserAction('opensettings');
            expect(settingsAction.category).toBe('settings');
            expect(settingsAction.isValid).toBe(true);
            expect(settingsAction.requiresConfirmation).toBe(false);
        });
    });
});