import * as vscode from 'vscode';
import { SelectionManager, SelectionInfo } from './SelectionManager';

export class TextProcessor {
    private selectionManager: SelectionManager;

    constructor() {
        this.selectionManager = new SelectionManager();
    }
    
    captureEditorText(): { success: boolean; text?: string; error?: string; selectionInfo?: SelectionInfo } {
        const selectionResult = this.selectionManager.detectSelection();
        
        if (!selectionResult.isValid) {
            return { 
                success: false, 
                error: selectionResult.error 
            };
        }

        return { 
            success: true, 
            text: selectionResult.selectionInfo!.text,
            selectionInfo: selectionResult.selectionInfo
        };
    }

    async replaceEditorText(newText: string, selectionRange?: { start: number; end: number }): Promise<{ success: boolean; error?: string }> {
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
                } else if (!selection.isEmpty) {
                    // Replace current selection
                    editBuilder.replace(selection, newText);
                } else {
                    // Replace entire document
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    editBuilder.replace(fullRange, newText);
                }
            });

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to replace text' 
            };
        }
    }

    getEditorState(): { 
        hasActiveEditor: boolean; 
        hasSelection: boolean; 
        isReadOnly: boolean;
        documentLength: number;
        selectionLength?: number;
    } {
        return this.selectionManager.getEditorState();
    }

    async createUndoPoint(description: string): Promise<void> {
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
    processTextForCorrection(): { success: boolean; text?: string; isSelection?: boolean; selectionRange?: { start: number; end: number }; error?: string } {
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
    async applyCorrectionToSelection(correctedText: string, originalSelectionRange?: { start: number; end: number }): Promise<{ success: boolean; error?: string }> {
        if (originalSelectionRange) {
            // Apply correction to specific range
            return await this.selectionManager.replaceTextInRange(originalSelectionRange, correctedText);
        } else {
            // Apply correction to current selection or full document
            return await this.replaceEditorText(correctedText);
        }
    }

    /**
     * Validates that a selection range is still valid in the current document
     */
    validateSelectionRange(range: { start: number; end: number }): boolean {
        return this.selectionManager.validateSelectionRange(range);
    }
}