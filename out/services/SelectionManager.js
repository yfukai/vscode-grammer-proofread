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
exports.SelectionManager = void 0;
const vscode = __importStar(require("vscode"));
class SelectionManager {
    /**
     * Detects and analyzes the current text selection in the active editor
     */
    detectSelection() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return {
                isValid: false,
                error: 'No active editor found'
            };
        }
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        const hasSelection = !selection.isEmpty;
        let text;
        let range;
        let position;
        if (hasSelection) {
            text = document.getText(selection);
            const startOffset = document.offsetAt(selection.start);
            const endOffset = document.offsetAt(selection.end);
            range = {
                start: startOffset,
                end: endOffset
            };
            position = {
                startLine: selection.start.line,
                startCharacter: selection.start.character,
                endLine: selection.end.line,
                endCharacter: selection.end.character
            };
        }
        else {
            text = document.getText();
            // No range or position for full document
        }
        if (text.trim() === '') {
            return {
                isValid: false,
                error: 'No text to process'
            };
        }
        const selectionInfo = {
            hasSelection,
            text,
            range,
            position
        };
        return {
            isValid: true,
            selectionInfo
        };
    }
    /**
     * Validates a selection range against the current document
     */
    validateSelectionRange(range) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return false;
        }
        const document = activeEditor.document;
        const documentLength = document.getText().length;
        // Validate range bounds
        if (range.start < 0 || range.end < 0) {
            return false;
        }
        if (range.start > documentLength || range.end > documentLength) {
            return false;
        }
        if (range.start > range.end) {
            return false;
        }
        return true;
    }
    /**
     * Gets text from a specific range in the active document
     */
    getTextFromRange(range) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return null;
        }
        if (!this.validateSelectionRange(range)) {
            return null;
        }
        const document = activeEditor.document;
        const startPosition = document.positionAt(range.start);
        const endPosition = document.positionAt(range.end);
        const vscodeRange = new vscode.Range(startPosition, endPosition);
        return document.getText(vscodeRange);
    }
    /**
     * Replaces text in a specific range of the active document
     */
    async replaceTextInRange(range, newText) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { success: false, error: 'No active editor found' };
        }
        if (!this.validateSelectionRange(range)) {
            return { success: false, error: 'Invalid selection range' };
        }
        const document = activeEditor.document;
        const startPosition = document.positionAt(range.start);
        const endPosition = document.positionAt(range.end);
        const vscodeRange = new vscode.Range(startPosition, endPosition);
        try {
            await activeEditor.edit(editBuilder => {
                editBuilder.replace(vscodeRange, newText);
            });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to replace text'
            };
        }
    }
    /**
     * Gets the current editor state including selection information
     */
    getEditorState() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return {
                hasActiveEditor: false,
                hasSelection: false,
                isReadOnly: true,
                documentLength: 0
            };
        }
        const hasSelection = !activeEditor.selection.isEmpty;
        let selectionLength;
        if (hasSelection) {
            const selectionText = activeEditor.document.getText(activeEditor.selection);
            selectionLength = selectionText.length;
        }
        return {
            hasActiveEditor: true,
            hasSelection,
            isReadOnly: activeEditor.document.uri.scheme === 'untitled' ? false : activeEditor.document.isUntitled,
            documentLength: activeEditor.document.getText().length,
            selectionLength
        };
    }
}
exports.SelectionManager = SelectionManager;
//# sourceMappingURL=SelectionManager.js.map