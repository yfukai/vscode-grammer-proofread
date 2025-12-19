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
describe('TextProcessor - Text Selection', () => {
    let textProcessor;
    beforeEach(() => {
        textProcessor = new TextProcessor_1.TextProcessor();
    });
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 1: Button click captures correct text based on selection state
         * Validates: Requirements 1.2, 5.1, 5.2
         */
        test('should capture selected text when selection exists, otherwise capture entire document', () => {
            // Generator for document text
            const documentTextArb = fc.string({ minLength: 1, maxLength: 1000 });
            // Generator for selection state (true = has selection, false = no selection)
            const hasSelectionArb = fc.boolean();
            // Generator for selected text (subset of document text when selection exists)
            const selectedTextArb = fc.string({ minLength: 1, maxLength: 500 });
            fc.assert(fc.property(documentTextArb, hasSelectionArb, selectedTextArb, (documentText, hasSelection, selectedText) => {
                // Setup mock editor based on selection state
                if (hasSelection) {
                    // Mock editor with selection
                    vscode.window.activeTextEditor = {
                        document: {
                            getText: jest.fn().mockImplementation((range) => {
                                if (range) {
                                    // Return selected text when range is provided
                                    return selectedText;
                                }
                                // Return full document when no range
                                return documentText;
                            })
                        },
                        selection: {
                            isEmpty: false,
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: selectedText.length }
                        }
                    };
                }
                else {
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
                }
                // Capture text using TextProcessor
                const result = textProcessor.captureEditorText();
                // Verify the result
                expect(result.success).toBe(true);
                expect(result.text).toBeDefined();
                if (hasSelection) {
                    // When selection exists, should capture selected text
                    expect(result.text).toBe(selectedText);
                    expect(vscode.window.activeTextEditor.document.getText).toHaveBeenCalledWith(vscode.window.activeTextEditor.selection);
                }
                else {
                    // When no selection, should capture entire document
                    expect(result.text).toBe(documentText);
                    expect(vscode.window.activeTextEditor.document.getText).toHaveBeenCalledWith();
                }
            }), { numRuns: 100 });
        });
        test('should handle edge cases for text selection detection', () => {
            // Generator for edge case scenarios
            const edgeCaseArb = fc.oneof(
            // Empty document
            fc.constant({ documentText: '', selectedText: '', hasSelection: false }), 
            // Empty selection
            fc.constant({ documentText: 'some text', selectedText: '', hasSelection: true }), 
            // Whitespace-only document
            fc.constant({ documentText: '   \n\t  ', selectedText: '  ', hasSelection: true }), 
            // Single character selection
            fc.constant({ documentText: 'hello world', selectedText: 'h', hasSelection: true }), 
            // Full document selected
            fc.record({
                documentText: fc.string({ minLength: 1, maxLength: 100 }),
                selectedText: fc.string({ minLength: 1, maxLength: 100 }),
                hasSelection: fc.constant(true)
            }).map(({ documentText, selectedText }) => ({
                documentText,
                selectedText: documentText,
                hasSelection: true
            })));
            fc.assert(fc.property(edgeCaseArb, ({ documentText, selectedText, hasSelection }) => {
                // Setup mock editor
                vscode.window.activeTextEditor = {
                    document: {
                        getText: jest.fn().mockImplementation((range) => {
                            if (range && hasSelection) {
                                return selectedText;
                            }
                            return documentText;
                        })
                    },
                    selection: {
                        isEmpty: !hasSelection,
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: hasSelection ? selectedText.length : 0 }
                    }
                };
                const result = textProcessor.captureEditorText();
                // For empty text cases, should return failure
                if ((hasSelection && selectedText.trim() === '') || (!hasSelection && documentText.trim() === '')) {
                    expect(result.success).toBe(false);
                    expect(result.error).toBe('No text to process');
                }
                else {
                    expect(result.success).toBe(true);
                    expect(result.text).toBeDefined();
                    if (hasSelection) {
                        expect(result.text).toBe(selectedText);
                    }
                    else {
                        expect(result.text).toBe(documentText);
                    }
                }
            }), { numRuns: 100 });
        });
        test('should handle no active editor scenario', () => {
            fc.assert(fc.property(fc.constant(null), () => {
                // Mock no active editor
                vscode.window.activeTextEditor = null;
                const result = textProcessor.captureEditorText();
                expect(result.success).toBe(false);
                expect(result.error).toBe('No active editor found');
                expect(result.text).toBeUndefined();
            }), { numRuns: 100 });
        });
    });
});
//# sourceMappingURL=TextSelection.test.js.map