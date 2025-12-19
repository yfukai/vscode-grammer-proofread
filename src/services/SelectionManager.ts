import * as vscode from 'vscode';

export interface SelectionInfo {
    hasSelection: boolean;
    text: string;
    range?: {
        start: number;
        end: number;
    };
    position?: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
}

export interface SelectionValidationResult {
    isValid: boolean;
    error?: string;
    selectionInfo?: SelectionInfo;
}

export class SelectionManager {
    
    /**
     * Detects and analyzes the current text selection in the active editor
     */
    detectSelection(): SelectionValidationResult {
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

        let text: string;
        let range: { start: number; end: number } | undefined;
        let position: { startLine: number; startCharacter: number; endLine: number; endCharacter: number } | undefined;

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
        } else {
            text = document.getText();
            // No range or position for full document
        }

        if (text.trim() === '') {
            return {
                isValid: false,
                error: 'No text to process'
            };
        }

        const selectionInfo: SelectionInfo = {
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
    validateSelectionRange(range: { start: number; end: number }): boolean {
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
    getTextFromRange(range: { start: number; end: number }): string | null {
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
    async replaceTextInRange(range: { start: number; end: number }, newText: string): Promise<{ success: boolean; error?: string }> {
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
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to replace text' 
            };
        }
    }

    /**
     * Gets the current editor state including selection information
     */
    getEditorState(): { 
        hasActiveEditor: boolean; 
        hasSelection: boolean; 
        isReadOnly: boolean;
        documentLength: number;
        selectionLength?: number;
    } {
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
        let selectionLength: number | undefined;

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