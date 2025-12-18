import * as vscode from 'vscode';

export class TextProcessor {
    
    captureEditorText(): { success: boolean; text?: string; error?: string } {
        const activeEditor = vscode.window.activeTextEditor;
        
        if (!activeEditor) {
            return { success: false, error: 'No active editor found' };
        }

        const document = activeEditor.document;
        const selection = activeEditor.selection;

        // If there's a selection, use that; otherwise use the entire document
        let text: string;
        if (!selection.isEmpty) {
            text = document.getText(selection);
        } else {
            text = document.getText();
        }

        if (text.trim() === '') {
            return { success: false, error: 'No text to process' };
        }

        return { success: true, text };
    }

    async replaceEditorText(newText: string): Promise<{ success: boolean; error?: string }> {
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

        return {
            hasActiveEditor: true,
            hasSelection: !activeEditor.selection.isEmpty,
            isReadOnly: activeEditor.document.uri.scheme === 'untitled' ? false : activeEditor.document.isUntitled,
            documentLength: activeEditor.document.getText().length
        };
    }

    async createUndoPoint(description: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            // VSCode automatically creates undo points for edit operations
            // This method is here for potential future enhancements
            await vscode.commands.executeCommand('workbench.action.files.save');
        }
    }
}