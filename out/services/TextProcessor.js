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
exports.TextProcessor = void 0;
const vscode = __importStar(require("vscode"));
const SelectionManager_1 = require("./SelectionManager");
class TextProcessor {
    constructor() {
        this.selectionManager = new SelectionManager_1.SelectionManager();
    }
    captureEditorText() {
        const selectionResult = this.selectionManager.detectSelection();
        if (!selectionResult.isValid) {
            return {
                success: false,
                error: selectionResult.error
            };
        }
        return {
            success: true,
            text: selectionResult.selectionInfo.text,
            selectionInfo: selectionResult.selectionInfo
        };
    }
    async replaceEditorText(newText, selectionRange) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { success: false, error: 'No active editor found' };
        }
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        try {
            await activeEditor.edit(editBuilder => {
                if (selectionRange) {
                    // Replace specific range
                    const startPosition = document.positionAt(selectionRange.start);
                    const endPosition = document.positionAt(selectionRange.end);
                    const range = new vscode.Range(startPosition, endPosition);
                    editBuilder.replace(range, newText);
                }
                else if (!selection.isEmpty) {
                    // Replace current selection
                    editBuilder.replace(selection, newText);
                }
                else {
                    // Replace entire document
                    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                    editBuilder.replace(fullRange, newText);
                }
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
    getEditorState() {
        return this.selectionManager.getEditorState();
    }
    async createUndoPoint(description) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            // VSCode automatically creates undo points for edit operations
            // This method is here for potential future enhancements
            await vscode.commands.executeCommand('workbench.action.files.save');
        }
    }
    /**
     * Processes text based on selection state - returns only selected text if selection exists
     */
    processTextForCorrection() {
        const result = this.captureEditorText();
        if (!result.success) {
            return result;
        }
        return {
            success: true,
            text: result.text,
            isSelection: result.selectionInfo?.hasSelection || false,
            selectionRange: result.selectionInfo?.range
        };
    }
    /**
     * Applies corrections to the appropriate text portion (selection or full document)
     */
    async applyCorrectionToSelection(correctedText, originalSelectionRange) {
        if (originalSelectionRange) {
            // Apply correction to specific range
            return await this.selectionManager.replaceTextInRange(originalSelectionRange, correctedText);
        }
        else {
            // Apply correction to current selection or full document
            return await this.replaceEditorText(correctedText);
        }
    }
    /**
     * Validates that a selection range is still valid in the current document
     */
    validateSelectionRange(range) {
        return this.selectionManager.validateSelectionRange(range);
    }
}
exports.TextProcessor = TextProcessor;
//# sourceMappingURL=TextProcessor.js.map