import * as fc from 'fast-check';
import { CorrectionService } from '../CorrectionService';
import { LLMApiClient } from '../LLMApiClient';
import { PromptManager } from '../PromptManager';
import { TaskManager } from '../TaskManager';
import { TextSelection, LLMApiConfiguration } from '../../types';

describe('CorrectionService', () => {
    let correctionService: CorrectionService;
    let promptManager: PromptManager;
    let apiClient: LLMApiClient;
    let taskManager: TaskManager;

    beforeEach(() => {
        promptManager = new PromptManager();
        promptManager.ensureDefaultPrompts();

        const apiConfig: LLMApiConfiguration = {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'test-key',
            model: 'gpt-3.5-turbo',
            maxTokens: 1000,
            temperature: 0.7
        };
        apiClient = new LLMApiClient(apiConfig);
        taskManager = new TaskManager();

        correctionService = new CorrectionService(promptManager, apiClient, taskManager);
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 4: Text replacement accuracy**
     * **Validates: Requirements 3.3**
     * 
     * For any selected text and LLM response, the corrected text should replace exactly 
     * the selected portion without affecting surrounding content
     */
    test('Property 4: Text replacement accuracy', () => {
        fc.assert(fc.property(
            fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 20 }), // lines of text
            fc.nat(), // start line index
            fc.nat(), // start character index
            fc.nat(), // end line index
            fc.nat(), // end character index
            fc.string({ minLength: 1, maxLength: 200 }), // corrected text
            (lines, startLineIdx, startCharIdx, endLineIdx, endCharIdx, correctedText) => {
                // Ensure we have valid text
                if (lines.length === 0) {
                    lines = ['test line'];
                }

                const originalText = lines.join('\n');
                
                // Create valid selection bounds
                const startLine = startLineIdx % lines.length;
                const endLine = Math.max(startLine, endLineIdx % lines.length);
                
                const startCharacter = Math.min(startCharIdx, lines[startLine].length);
                const endCharacter = startLine === endLine 
                    ? Math.max(startCharacter, Math.min(endCharIdx, lines[endLine].length))
                    : Math.min(endCharIdx, lines[endLine].length);

                const selection: TextSelection = {
                    documentUri: 'test://document.txt',
                    startLine,
                    startCharacter,
                    endLine,
                    endCharacter
                };

                // Validate selection first
                if (!correctionService.validateSelection(originalText, selection)) {
                    return true; // Skip invalid selections
                }

                // Extract the selected text
                const selectedText = correctionService.extractSelectedText(originalText, selection);
                
                // Perform replacement
                const resultText = correctionService.replaceTextInSelection(
                    originalText,
                    selection,
                    correctedText
                );

                // Property 1: Result should be different from original (unless corrected text equals selected text)
                if (correctedText !== selectedText) {
                    expect(resultText).not.toBe(originalText);
                }

                // Property 2: Text before selection should remain unchanged
                const originalLines = originalText.split('\n');
                const resultLines = resultText.split('\n');
                
                // Check lines before selection
                for (let i = 0; i < startLine; i++) {
                    expect(resultLines[i]).toBe(originalLines[i]);
                }

                // Check characters before selection on start line
                if (startLine < resultLines.length) {
                    const originalStartLine = originalLines[startLine];
                    const resultStartLine = resultLines[startLine];
                    const beforeSelection = originalStartLine.substring(0, startCharacter);
                    expect(resultStartLine.startsWith(beforeSelection)).toBe(true);
                }

                // Property 3: Text after selection should remain unchanged
                // For single-line selections
                if (startLine === endLine) {
                    const originalLine = originalLines[startLine];
                    const afterSelection = originalLine.substring(endCharacter);
                    const resultLine = resultLines[startLine];
                    expect(resultLine.endsWith(afterSelection)).toBe(true);
                } else {
                    // For multi-line selections, check the last line's suffix
                    const originalEndLine = originalLines[endLine];
                    const afterSelection = originalEndLine.substring(endCharacter);
                    
                    // Find the corresponding line in the result
                    // The result might have different number of lines due to corrected text
                    const correctedTextLines = correctedText.split('\n');
                    const expectedResultEndLineIndex = startLine + correctedTextLines.length - 1;
                    
                    if (expectedResultEndLineIndex < resultLines.length) {
                        const resultEndLine = resultLines[expectedResultEndLineIndex];
                        expect(resultEndLine.endsWith(afterSelection)).toBe(true);
                    }
                }

                // Property 4: The corrected text should appear in the result
                expect(resultText.includes(correctedText)).toBe(true);

                // Property 5: Replacement should be idempotent for simple cases
                // For single-line replacements, replacing the result with the same text should be stable
                if (startLine === endLine && !correctedText.includes('\n')) {
                    const newSelection: TextSelection = {
                        ...selection,
                        endCharacter: startCharacter + correctedText.length
                    };
                    
                    if (correctionService.validateSelection(resultText, newSelection)) {
                        const secondReplacement = correctionService.replaceTextInSelection(
                            resultText,
                            newSelection,
                            correctedText
                        );
                        expect(secondReplacement).toBe(resultText);
                    }
                }

                return true;
            }
        ), { numRuns: 100 });
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 8: Full document processing preservation**
     * **Validates: Requirements 8.1, 8.2, 8.5**
     * 
     * For any document content, when applying corrections to the entire document, 
     * the operation should preserve the document structure while updating the text content
     */
    test('Property 8: Full document processing preservation', async () => {
        // Mock the API client to return predictable results
        const mockApiClient = {
            sendRequest: jest.fn().mockResolvedValue('Corrected text content'),
            validateConfiguration: jest.fn().mockReturnValue([]),
            updateConfiguration: jest.fn(),
            getConfiguration: jest.fn().mockReturnValue({
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'test-key',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.7
            }),
            testConnection: jest.fn().mockResolvedValue(true)
        } as any;

        const mockCorrectionService = new CorrectionService(
            promptManager,
            mockApiClient,
            taskManager
        );

        await fc.assert(fc.asyncProperty(
            fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 20 }), // document lines
            async (lines) => {
                const documentText = lines.join('\n');
                const documentUri = 'test://document.txt';
                const prompts = promptManager.getPrompts();
                
                if (prompts.length === 0) {
                    return true; // Skip if no prompts available
                }

                const promptId = prompts[0].id;

                // Process full document
                const correctedText = await mockCorrectionService.processFullDocument(documentText, promptId, documentUri);
                
                // Property 1: Result should not be empty
                expect(correctedText).toBeTruthy();
                expect(correctedText.trim().length).toBeGreaterThan(0);

                // Property 2: API should have been called with the full document text
                expect(mockApiClient.sendRequest).toHaveBeenCalled();
                const callArgs = mockApiClient.sendRequest.mock.calls[mockApiClient.sendRequest.mock.calls.length - 1];
                expect(callArgs[1]).toBe(documentText);

                // Property 3: The corrected text should be the API response
                expect(correctedText).toBe('Corrected text content');

                // Reset mock for next iteration
                mockApiClient.sendRequest.mockClear();

                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific scenarios
    describe('Text replacement edge cases', () => {
        test('should replace single character', () => {
            const text = 'Hello World';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 1
            };

            const result = correctionService.replaceTextInSelection(text, selection, 'h');
            expect(result).toBe('hello World');
        });

        test('should replace entire line', () => {
            const text = 'Line 1\nLine 2\nLine 3';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 1,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 6
            };

            const result = correctionService.replaceTextInSelection(text, selection, 'New Line');
            expect(result).toBe('Line 1\nNew Line\nLine 3');
        });

        test('should replace multiple lines', () => {
            const text = 'Line 1\nLine 2\nLine 3\nLine 4';
            // Select from start of "Line 2" (line 1, char 0) to end of "Line 3" (line 2, char 6)
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 1,
                startCharacter: 0,
                endLine: 2,
                endCharacter: 6
            };

            const result = correctionService.replaceTextInSelection(text, selection, 'Replaced');
            // Should replace "Line 2\nLine 3" with "Replaced"
            expect(result).toBe('Line 1\nReplaced\nLine 4');
        });

        test('should handle empty replacement', () => {
            const text = 'Hello World';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 5,
                endLine: 0,
                endCharacter: 11
            };

            const result = correctionService.replaceTextInSelection(text, selection, '');
            expect(result).toBe('Hello');
        });

        test('should reject invalid selection bounds', () => {
            const text = 'Hello World';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 5, // Invalid: beyond text bounds
                endCharacter: 0
            };

            expect(() => correctionService.replaceTextInSelection(text, selection, 'test'))
                .toThrow('Invalid selection bounds');
        });
    });

    describe('Selection validation', () => {
        test('should validate correct selection', () => {
            const text = 'Line 1\nLine 2\nLine 3';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 6
            };

            expect(correctionService.validateSelection(text, selection)).toBe(true);
        });

        test('should reject selection with invalid line bounds', () => {
            const text = 'Line 1\nLine 2';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 5,
                endCharacter: 0
            };

            expect(correctionService.validateSelection(text, selection)).toBe(false);
        });

        test('should reject selection with invalid character bounds', () => {
            const text = 'Hello';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 100
            };

            expect(correctionService.validateSelection(text, selection)).toBe(false);
        });

        test('should reject selection with start after end on same line', () => {
            const text = 'Hello World';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 10,
                endLine: 0,
                endCharacter: 5
            };

            expect(correctionService.validateSelection(text, selection)).toBe(false);
        });
    });

    describe('Text extraction', () => {
        test('should extract single line selection', () => {
            const text = 'Hello World';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 5
            };

            const extracted = correctionService.extractSelectedText(text, selection);
            expect(extracted).toBe('Hello');
        });

        test('should extract multi-line selection', () => {
            const text = 'Line 1\nLine 2\nLine 3';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 5,
                endLine: 2,
                endCharacter: 4
            };

            const extracted = correctionService.extractSelectedText(text, selection);
            expect(extracted).toBe('1\nLine 2\nLine');
        });

        test('should throw on invalid selection', () => {
            const text = 'Hello';
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 5,
                endCharacter: 0
            };

            expect(() => correctionService.extractSelectedText(text, selection))
                .toThrow('Invalid text selection');
        });
    });

    describe('Concurrency control', () => {
        test('should block overlapping selections', () => {
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };

            // Start a task
            taskManager.startTask(selection);

            // Check if selection is blocked
            expect(correctionService.isSelectionBlocked(selection)).toBe(true);
        });

        test('should allow non-overlapping selections', () => {
            const selection1: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };

            const selection2: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 5,
                startCharacter: 0,
                endLine: 6,
                endCharacter: 10
            };

            // Start a task on selection1
            taskManager.startTask(selection1);

            // Check if selection2 is blocked (should not be)
            expect(correctionService.isSelectionBlocked(selection2)).toBe(false);
        });

        test('should allow selections in different documents', () => {
            const selection1: TextSelection = {
                documentUri: 'test://doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };

            const selection2: TextSelection = {
                documentUri: 'test://doc2.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };

            // Start a task on selection1
            taskManager.startTask(selection1);

            // Check if selection2 is blocked (should not be - different document)
            expect(correctionService.isSelectionBlocked(selection2)).toBe(false);
        });
    });

    describe('Full document processing', () => {
        test('should reject empty document', async () => {
            const prompts = promptManager.getPrompts();
            await expect(
                correctionService.processFullDocument('', prompts[0].id, 'test://doc.txt')
            ).rejects.toThrow('Document is empty');
        });

        test('should reject whitespace-only document', async () => {
            const prompts = promptManager.getPrompts();
            await expect(
                correctionService.processFullDocument('   \n  \n  ', prompts[0].id, 'test://doc.txt')
            ).rejects.toThrow('Document is empty');
        });
    });

    describe('Statistics', () => {
        test('should track active tasks', () => {
            const selection: TextSelection = {
                documentUri: 'test://doc.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };

            const stats1 = correctionService.getStatistics();
            expect(stats1.activeTasks).toBe(0);

            const taskId = taskManager.startTask(selection);
            const stats2 = correctionService.getStatistics();
            expect(stats2.activeTasks).toBe(1);

            taskManager.completeTask(taskId);
            const stats3 = correctionService.getStatistics();
            expect(stats3.activeTasks).toBe(0);
        });
    });
});