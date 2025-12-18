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
class TextProcessor {
    captureEditorText() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { success: false, error: 'No active editor found' };
        }
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        // If there's a selection, use that; otherwise use the entire document
        let text;
        if (!selection.isEmpty) {
            text = document.getText(selection);
        }
        else {
            text = document.getText();
        }
        if (text.trim() === '') {
            return { success: false, error: 'No text to process' };
        }
        return { success: true, text };
    }
    async replaceEditorText(newText) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { success: false, error: 'No active editor found' };
        }
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        try {
            await activeEditor.edit(editBuilder => {
                if (!selection.isEmpty) {
                    // Replace selected text
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
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return {
                hasActiveEditor: false,
                hasSelection: false,
                isReadOnly: true,
                documentLength: 0
            };
        }
        return {
            hasActiveEditor: true,
            hasSelection: !activeEditor.selection.isEmpty,
            isReadOnly: activeEditor.document.uri.scheme === 'untitled' ? false : activeEditor.document.isUntitled,
            documentLength: activeEditor.document.getText().length
        };
    }
    async createUndoPoint(description) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            // VSCode automatically creates undo points for edit operations
            // This method is here for potential future enhancements
            await vscode.commands.executeCommand('workbench.action.files.save');
        }
    }
}
exports.TextProcessor = TextProcessor;
//# sourceMappingURL=TextProcessor.js.map