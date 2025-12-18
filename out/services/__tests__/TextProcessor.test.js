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
// Mock VSCode API
const mockVscode = {
    window: {
        activeTextEditor: null
    },
    Range: class MockRange {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    commands: {
        executeCommand: jest.fn()
    }
};
jest.doMock('vscode', () => mockVscode, { virtual: true });
// Create a simplified text processor for testing
class TextProcessorLogic {
    captureText(hasActiveEditor, documentText, selectionText, hasSelection) {
        if (!hasActiveEditor) {
            return { success: false, error: 'No active editor found' };
        }
        const text = hasSelection ? selectionText : documentText;
        if (text.trim() === '') {
            return { success: false, error: 'No text to process' };
        }
        return { success: true, text };
    }
    validateReplacement(hasActiveEditor, newText) {
        if (!hasActiveEditor) {
            return { success: false, error: 'No active editor found' };
        }
        if (typeof newText !== 'string') {
            return { success: false, error: 'Invalid replacement text' };
        }
        return { success: true };
    }
    getEditorState(hasActiveEditor, hasSelection, documentLength, isReadOnly) {
        if (!hasActiveEditor) {
            return {
                hasActiveEditor: false,
                hasSelection: false,
                isReadOnly: true,
                documentLength: 0
            };
        }
        return {
            hasActiveEditor: true,
            hasSelection,
            isReadOnly,
            documentLength
        };
    }
}
describe('TextProcessor', () => {
    let textProcessor;
    beforeEach(() => {
        textProcessor = new TextProcessorLogic();
    });
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 1: Button click captures editor text
         * Validates: Requirements 1.2
         */
        test('should capture text when active editor is available', () => {
            const textArb = fc.string({ minLength: 1 });
            const selectionArb = fc.string();
            const hasSelectionArb = fc.boolean();
            fc.assert(fc.property(textArb, selectionArb, hasSelectionArb, (documentText, selectionText, hasSelection) => {
                const result = textProcessor.captureText(true, documentText, selectionText, hasSelection);
                const expectedText = hasSelection ? selectionText : documentText;
                if (expectedText.trim() === '') {
                    expect(result.success).toBe(false);
                    expect(result.error).toBe('No text to process');
                }
                else {
                    expect(result.success).toBe(true);
                    expect(result.text).toBe(expectedText);
                }
            }), { numRuns: 100 });
        });
        test('should fail to capture text when no active editor', () => {
            const textArb = fc.string();
            const selectionArb = fc.string();
            const hasSelectionArb = fc.boolean();
            fc.assert(fc.property(textArb, selectionArb, hasSelectionArb, (documentText, selectionText, hasSelection) => {
                const result = textProcessor.captureText(false, documentText, selectionText, hasSelection);
                expect(result.success).toBe(false);
                expect(result.error).toBe('No active editor found');
                expect(result.text).toBeUndefined();
            }), { numRuns: 100 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 4: Valid responses trigger text replacement
         * Validates: Requirements 1.5
         */
        test('should validate text replacement when active editor is available', () => {
            const newTextArb = fc.string();
            fc.assert(fc.property(newTextArb, (newText) => {
                const result = textProcessor.validateReplacement(true, newText);
                expect(result.success).toBe(true);
                expect(result.error).toBeUndefined();
            }), { numRuns: 100 });
        });
        test('should fail text replacement validation when no active editor', () => {
            const newTextArb = fc.string();
            fc.assert(fc.property(newTextArb, (newText) => {
                const result = textProcessor.validateReplacement(false, newText);
                expect(result.success).toBe(false);
                expect(result.error).toBe('No active editor found');
            }), { numRuns: 100 });
        });
        test('should handle whitespace-only text correctly', () => {
            const whitespaceArb = fc.oneof(fc.constant(''), fc.constant('   '), fc.constant('\t\t'), fc.constant('\n\n'), fc.constant('  \t  \n  '));
            fc.assert(fc.property(whitespaceArb, (whitespaceText) => {
                const result = textProcessor.captureText(true, whitespaceText, '', false);
                expect(result.success).toBe(false);
                expect(result.error).toBe('No text to process');
            }), { numRuns: 100 });
        });
        test('should correctly determine text source based on selection', () => {
            const documentTextArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
            const selectionTextArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
            fc.assert(fc.property(documentTextArb, selectionTextArb, (documentText, selectionText) => {
                // Test with selection
                const resultWithSelection = textProcessor.captureText(true, documentText, selectionText, true);
                expect(resultWithSelection.success).toBe(true);
                expect(resultWithSelection.text).toBe(selectionText);
                // Test without selection
                const resultWithoutSelection = textProcessor.captureText(true, documentText, selectionText, false);
                expect(resultWithoutSelection.success).toBe(true);
                expect(resultWithoutSelection.text).toBe(documentText);
            }), { numRuns: 100 });
        });
        test('should return correct editor state information', () => {
            const hasActiveEditorArb = fc.boolean();
            const hasSelectionArb = fc.boolean();
            const documentLengthArb = fc.nat();
            const isReadOnlyArb = fc.boolean();
            fc.assert(fc.property(hasActiveEditorArb, hasSelectionArb, documentLengthArb, isReadOnlyArb, (hasActiveEditor, hasSelection, documentLength, isReadOnly) => {
                const state = textProcessor.getEditorState(hasActiveEditor, hasSelection, documentLength, isReadOnly);
                if (!hasActiveEditor) {
                    expect(state.hasActiveEditor).toBe(false);
                    expect(state.hasSelection).toBe(false);
                    expect(state.isReadOnly).toBe(true);
                    expect(state.documentLength).toBe(0);
                }
                else {
                    expect(state.hasActiveEditor).toBe(true);
                    expect(state.hasSelection).toBe(hasSelection);
                    expect(state.isReadOnly).toBe(isReadOnly);
                    expect(state.documentLength).toBe(documentLength);
                }
            }), { numRuns: 100 });
        });
    });
    describe('Unit Tests', () => {
        test('should capture document text when no selection', () => {
            const documentText = 'This is the full document text.';
            const result = textProcessor.captureText(true, documentText, '', false);
            expect(result.success).toBe(true);
            expect(result.text).toBe(documentText);
        });
        test('should capture selection text when selection exists', () => {
            const documentText = 'This is the full document text.';
            const selectionText = 'selected portion';
            const result = textProcessor.captureText(true, documentText, selectionText, true);
            expect(result.success).toBe(true);
            expect(result.text).toBe(selectionText);
        });
        test('should handle empty document gracefully', () => {
            const result = textProcessor.captureText(true, '', '', false);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No text to process');
        });
        test('should validate replacement with valid text', () => {
            const result = textProcessor.validateReplacement(true, 'New corrected text');
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
        test('should handle empty replacement text', () => {
            const result = textProcessor.validateReplacement(true, '');
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
        test('should return correct state for active editor with selection', () => {
            const state = textProcessor.getEditorState(true, true, 100, false);
            expect(state.hasActiveEditor).toBe(true);
            expect(state.hasSelection).toBe(true);
            expect(state.isReadOnly).toBe(false);
            expect(state.documentLength).toBe(100);
        });
        test('should return correct state for no active editor', () => {
            const state = textProcessor.getEditorState(false, false, 0, false);
            expect(state.hasActiveEditor).toBe(false);
            expect(state.hasSelection).toBe(false);
            expect(state.isReadOnly).toBe(true);
            expect(state.documentLength).toBe(0);
        });
    });
});
//# sourceMappingURL=TextProcessor.test.js.map