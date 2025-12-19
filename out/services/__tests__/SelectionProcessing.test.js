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
const TextProcessor_1 = require("../TextProcessor");
const SelectionManager_1 = require("../SelectionManager");
// Mock VSCode API
jest.mock('vscode', () => ({
    window: {
        activeTextEditor: null
    },
    Range: class {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    commands: {
        executeCommand: jest.fn()
    }
}), { virtual: true });
const vscode = require('vscode');
describe('TextProcessor - Selection Processing Properties', () => {
    let textProcessor;
    let selectionManager;
    beforeEach(() => {
        textProcessor = new TextProcessor_1.TextProcessor();
        selectionManager = new SelectionManager_1.SelectionManager();
        jest.clearAllMocks();
    });
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 14: Selection processing sends only selected text
         * Validates: Requirements 5.3
         */
        test('should send only selected text when processing selections', () => {
            // Generator for document text
            const documentTextArb = fc.string({ minLength: 10, maxLength: 1000 });
            // Generator for selected text (subset of document)
            const selectedTextArb = fc.string({ minLength: 1, maxLength: 100 });
            fc.assert(fc.property(documentTextArb, selectedTextArb, (documentText, selectedText) => {
                // Ensure selected text is different from document text to test selection behavior
                fc.pre(selectedText !== documentText);
                fc.pre(selectedText.trim().length > 0);
                fc.pre(documentText.trim().length > 0);
                // Mock editor with selection
                const startOffset = Math.floor(Math.random() * Math.max(1, documentText.length - selectedText.length));
                const endOffset = startOffset + selectedText.length;
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockImplementation((range) => {
                            if (range) {
                                // Return selected text when range is provided
                                return selectedText;
                            }
                            // Return full document when no range
                            return documentText;
                        }),
                        offsetAt: jest.fn().mockImplementation((position) => {
                            if (position === vscode.window.activeTextEditor.selection.start) {
                                return startOffset;
                            }
                            if (position === vscode.window.activeTextEditor.selection.end) {
                                return endOffset;
                            }
                            return 0;
                        }),
                        positionAt: jest.fn().mockImplementation((offset) => {
                            return { line: 0, character: offset };
                        })
                    },
                    selection: {
                        isEmpty: false,
                        start: { line: 0, character: startOffset },
                        end: { line: 0, character: endOffset }
                    }
                };
                // Process text for correction
                const result = textProcessor.processTextForCorrection();
                // Verify the result
                expect(result.success).toBe(true);
                expect(result.text).toBe(selectedText);
                expect(result.isSelection).toBe(true);
                expect(result.selectionRange).toEqual({
                    start: startOffset,
                    end: endOffset
                });
                // Verify that only selected text is captured, not the full document
                expect(result.text).not.toBe(documentText);
                expect(vscode.window.activeTextEditor.document.getText).toHaveBeenCalledWith(vscode.window.activeTextEditor.selection);
            }), { numRuns: 100 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 15: Selection corrections replace only selected portion
         * Validates: Requirements 5.4
         */
        test('should replace only selected portion when applying corrections', async () => {
            // Generator for document text
            const documentTextArb = fc.string({ minLength: 20, maxLength: 500 });
            // Generator for selected text and corrected text
            const textPairArb = fc.record({
                selectedText: fc.string({ minLength: 1, maxLength: 50 }),
                correctedText: fc.string({ minLength: 1, maxLength: 50 })
            });
            await fc.assert(fc.asyncProperty(documentTextArb, textPairArb, async (documentText, { selectedText, correctedText }) => {
                // Ensure we have valid text to work with
                fc.pre(selectedText.trim().length > 0);
                fc.pre(correctedText.trim().length > 0);
                fc.pre(documentText.trim().length > 0);
                fc.pre(selectedText !== correctedText); // Ensure there's actually a correction
                // Calculate selection range within document bounds
                const maxStartOffset = Math.max(0, documentText.length - selectedText.length);
                const startOffset = Math.floor(Math.random() * (maxStartOffset + 1));
                const endOffset = startOffset + selectedText.length;
                // Mock editor with selection
                const mockEdit = jest.fn();
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockImplementation((range) => {
                            if (range) {
                                return selectedText;
                            }
                            return documentText;
                        }),
                        offsetAt: jest.fn().mockImplementation((position) => {
                            if (position.line === 0 && position.character === startOffset) {
                                return startOffset;
                            }
                            if (position.line === 0 && position.character === endOffset) {
                                return endOffset;
                            }
                            return position.character;
                        }),
                        positionAt: jest.fn().mockImplementation((offset) => {
                            return { line: 0, character: offset };
                        })
                    },
                    selection: {
                        isEmpty: false,
                        start: { line: 0, character: startOffset },
                        end: { line: 0, character: endOffset }
                    },
                    edit: jest.fn().mockImplementation(async (callback) => {
                        const editBuilder = {
                            replace: mockEdit
                        };
                        callback(editBuilder);
                        return Promise.resolve(true);
                    })
                };
                // Apply correction to selection
                const selectionRange = { start: startOffset, end: endOffset };
                const result = await textProcessor.applyCorrectionToSelection(correctedText, selectionRange);
                // Verify the result
                expect(result.success).toBe(true);
                expect(vscode.window.activeTextEditor.edit).toHaveBeenCalled();
                expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({
                    start: { line: 0, character: startOffset },
                    end: { line: 0, character: endOffset }
                }), correctedText);
                // Verify that only the selected range was replaced, not the entire document
                expect(mockEdit).toHaveBeenCalledTimes(1);
            }), { numRuns: 100 });
        });
        test('should handle full document processing when no selection exists', () => {
            // Generator for document text
            const documentTextArb = fc.string({ minLength: 1, maxLength: 1000 });
            fc.assert(fc.property(documentTextArb, (documentText) => {
                fc.pre(documentText.trim().length > 0);
                // Mock editor without selection
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockImplementation((range) => {
                            // Always return full document text when no selection
                            return documentText;
                        })
                    },
                    selection: {
                        isEmpty: true,
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 }
                    }
                };
                // Process text for correction
                const result = textProcessor.processTextForCorrection();
                // Verify the result
                expect(result.success).toBe(true);
                expect(result.text).toBe(documentText);
                expect(result.isSelection).toBe(false);
                expect(result.selectionRange).toBeUndefined();
                // Verify that full document text is captured
                expect(vscode.window.activeTextEditor.document.getText).toHaveBeenCalledWith();
            }), { numRuns: 100 });
        });
        test('should validate selection ranges correctly', () => {
            // Generator for document text and selection ranges
            const documentTextArb = fc.string({ minLength: 10, maxLength: 100 });
            const rangeArb = fc.record({
                start: fc.integer({ min: -5, max: 150 }),
                end: fc.integer({ min: -5, max: 150 })
            });
            fc.assert(fc.property(documentTextArb, rangeArb, (documentText, range) => {
                // Mock editor
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockReturnValue(documentText)
                    }
                };
                // Validate selection range
                const isValid = textProcessor.validateSelectionRange(range);
                // Determine expected validity
                const documentLength = documentText.length;
                const expectedValid = range.start >= 0 &&
                    range.end >= 0 &&
                    range.start <= documentLength &&
                    range.end <= documentLength &&
                    range.start <= range.end;
                expect(isValid).toBe(expectedValid);
            }), { numRuns: 100 });
        });
        test('should handle edge cases in selection processing', () => {
            // Generator for edge case scenarios
            const edgeCaseArb = fc.oneof(
            // Empty selection in non-empty document
            fc.record({
                documentText: fc.string({ minLength: 1, maxLength: 100 }),
                selectedText: fc.constant(''),
                hasSelection: fc.constant(true)
            }), 
            // Whitespace-only selection
            fc.record({
                documentText: fc.string({ minLength: 1, maxLength: 100 }),
                selectedText: fc.constantFrom('   ', '\t\t', '\n\n', '  \t\n  '),
                hasSelection: fc.constant(true)
            }), 
            // Single character selection
            fc.record({
                documentText: fc.string({ minLength: 5, maxLength: 100 }),
                selectedText: fc.char(),
                hasSelection: fc.constant(true)
            }));
            fc.assert(fc.property(edgeCaseArb, ({ documentText, selectedText, hasSelection }) => {
                // Calculate selection offsets
                const startOffset = 0;
                const endOffset = hasSelection ? selectedText.length : 0;
                // Mock editor with complete document interface
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockImplementation((range) => {
                            if (range && hasSelection) {
                                return selectedText;
                            }
                            return documentText;
                        }),
                        offsetAt: jest.fn().mockImplementation((position) => {
                            if (position === vscode.window.activeTextEditor.selection.start) {
                                return startOffset;
                            }
                            if (position === vscode.window.activeTextEditor.selection.end) {
                                return endOffset;
                            }
                            return 0;
                        }),
                        positionAt: jest.fn().mockImplementation((offset) => {
                            return { line: 0, character: offset };
                        })
                    },
                    selection: {
                        isEmpty: !hasSelection,
                        start: { line: 0, character: startOffset },
                        end: { line: 0, character: endOffset }
                    }
                };
                const result = textProcessor.processTextForCorrection();
                // For empty or whitespace-only selections, should return failure
                if (hasSelection && selectedText.trim() === '') {
                    expect(result.success).toBe(false);
                    expect(result.error).toBe('No text to process');
                }
                else {
                    expect(result.success).toBe(true);
                    expect(result.text).toBeDefined();
                    if (hasSelection) {
                        expect(result.text).toBe(selectedText);
                        expect(result.isSelection).toBe(true);
                    }
                    else {
                        expect(result.text).toBe(documentText);
                        expect(result.isSelection).toBe(false);
                    }
                }
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=SelectionProcessing.test.js.map