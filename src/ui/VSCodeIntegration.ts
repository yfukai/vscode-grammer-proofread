import * as vscode from 'vscode';
import { CustomPrompt, TextSelection } from '../types';
import { CorrectionService } from '../services/CorrectionService';
import { PromptManager } from '../services/PromptManager';
import { ChatWidget } from './ChatWidget';

/**
 * Manages VSCode integration including context menus, command palette, and status indicators
 */
export class VSCodeIntegration {
    private correctionService: CorrectionService;
    private promptManager: PromptManager;
    private chatWidget: ChatWidget;
    private disposables: vscode.Disposable[] = [];
    private statusBarItem: vscode.StatusBarItem;
    private outputChannel: vscode.OutputChannel;

    constructor(
        correctionService: CorrectionService,
        promptManager: PromptManager,
        chatWidget: ChatWidget
    ) {
        this.correctionService = correctionService;
        this.promptManager = promptManager;
        this.chatWidget = chatWidget;
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.text = '$(pencil) Grammar';
        this.statusBarItem.tooltip = 'Click to show Grammar Proofreading Chat';
        this.statusBarItem.command = 'grammarProofreading.showChatWidget';
        this.statusBarItem.show();
        
        // Create output channel for logging
        this.outputChannel = vscode.window.createOutputChannel('Grammar Proofreading');
        
        this.registerCommands();
        this.registerContextMenus();
        this.setupEventListeners();
    }

    /**
     * Registers all extension commands
     */
    private registerCommands(): void {
        // Register dynamic prompt commands
        this.refreshPromptCommands();

        // Register static commands
        const commands = [
            vscode.commands.registerCommand('grammarProofreading.openSettings', () => {
                vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading');
            }),
            vscode.commands.registerCommand('grammarProofreading.refreshPrompts', () => {
                this.refreshPromptCommands();
                this.chatWidget.refreshPromptButtons();
            }),
            vscode.commands.registerCommand('grammarProofreading.processFullDocument', () => {
                this.processFullDocument();
            }),
            vscode.commands.registerCommand('grammarProofreading.showChatWidget', async () => {
                // Try to focus the chat widget view
                try {
                    await vscode.commands.executeCommand('grammarProofreading.chatWidget.focus');
                } catch (error) {
                    // If focus fails, try to show the view container
                    const config = vscode.workspace.getConfiguration('grammarProofreading');
                    const position = config.get<string>('chatWidgetPosition', 'explorer');
                    
                    switch (position) {
                        case 'explorer':
                            await vscode.commands.executeCommand('workbench.view.explorer');
                            break;
                        case 'scm':
                            await vscode.commands.executeCommand('workbench.view.scm');
                            break;
                        case 'debug':
                            await vscode.commands.executeCommand('workbench.view.debug');
                            break;
                        case 'extensions':
                            await vscode.commands.executeCommand('workbench.view.extensions');
                            break;
                        case 'panel':
                            await vscode.commands.executeCommand('workbench.panel.grammarProofreading.panel.focus');
                            break;
                    }
                    
                    // Try to focus the widget again after showing the container
                    setTimeout(() => {
                        vscode.commands.executeCommand('grammarProofreading.chatWidget.focus');
                    }, 100);
                }
            }),
            vscode.commands.registerCommand('grammarProofreading.clearChatHistory', () => {
                this.chatWidget.clearHistory();
                this.showMessage('Chat history cleared', 'info');
            })
        ];

        this.disposables.push(...commands);
    }

    /**
     * Registers context menu items for selected text
     */
    private registerContextMenus(): void {
        // Context menu items are defined in package.json and will call the dynamic prompt commands
        // This method can be extended to add programmatic context menu items if needed
    }

    /**
     * Sets up event listeners for configuration changes and other events
     */
    private setupEventListeners(): void {
        // Listen for configuration changes
        const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('grammarProofreading')) {
                this.refreshPromptCommands();
                this.chatWidget.refreshPromptButtons();
            }
        });

        // Listen for text selection changes to update status
        const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
            this.updateStatusForSelection(event.textEditor);
        });

        // Listen for active editor changes
        const editorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.updateStatusForSelection(editor);
            }
        });

        this.disposables.push(configListener, selectionListener, editorListener);
    }

    /**
     * Refreshes prompt commands in the command palette
     */
    public refreshPromptCommands(): void {
        // Dispose existing prompt commands
        const existingCommands = this.disposables.filter(d => 
            (d as any)._commandId?.startsWith('grammarProofreading.prompt.')
        );
        existingCommands.forEach(cmd => {
            cmd.dispose();
            const index = this.disposables.indexOf(cmd);
            if (index > -1) {
                this.disposables.splice(index, 1);
            }
        });

        // Register new prompt commands
        const prompts = this.promptManager.getPrompts();
        for (const prompt of prompts) {
            const commandId = `grammarProofreading.prompt.${prompt.id}`;
            const command = vscode.commands.registerCommand(commandId, () => {
                this.executePromptOnSelection(prompt.id);
            });
            
            // Store command ID for later disposal
            (command as any)._commandId = commandId;
            this.disposables.push(command);
        }
    }

    /**
     * Executes a prompt on the currently selected text
     */
    private async executePromptOnSelection(promptId: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.showMessage('No active text editor found', 'error');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText || selectedText.trim().length === 0) {
            this.showMessage('No text selected. Please select text to correct.', 'warning');
            return;
        }

        const prompt = this.promptManager.getPrompt(promptId);
        if (!prompt) {
            this.showMessage('Prompt not found', 'error');
            return;
        }

        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Correcting text with "${prompt.name}"...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Sending request...' });

                // Create text selection object
                const textSelection: TextSelection = {
                    documentUri: editor.document.uri.toString(),
                    startLine: selection.start.line,
                    startCharacter: selection.start.character,
                    endLine: selection.end.line,
                    endCharacter: selection.end.character
                };

                // Execute correction
                const correctionRequest = {
                    promptId,
                    text: selectedText,
                    selection: textSelection,
                    isFullDocument: false
                };

                progress.report({ increment: 50, message: 'Processing response...' });
                const response = await this.correctionService.executeCorrection(correctionRequest);

                // Replace text in editor
                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, response.correctedText);
                });

                progress.report({ increment: 100, message: 'Complete!' });
                
                // Add to chat history
                this.chatWidget.addMessage({
                    id: this.generateMessageId(),
                    type: 'request',
                    content: `Corrected text using "${prompt.name}":\n\n${selectedText}`,
                    promptName: prompt.name,
                    timestamp: new Date()
                });

                this.chatWidget.addMessage({
                    id: this.generateMessageId(),
                    type: 'response',
                    content: response.correctedText,
                    promptName: prompt.name,
                    timestamp: new Date()
                });
            });

            this.showMessage(`Text corrected successfully with "${prompt.name}"`, 'info');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.showMessage(`Correction failed: ${errorMessage}`, 'error');
            this.outputChannel.appendLine(`Error in executePromptOnSelection: ${errorMessage}`);
            
            // Add error to chat history
            this.chatWidget.addMessage({
                id: this.generateMessageId(),
                type: 'error',
                content: errorMessage,
                promptName: prompt.name,
                timestamp: new Date()
            });
        }
    }

    /**
     * Processes the entire active document
     */
    private async processFullDocument(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.showMessage('No active text editor found', 'error');
            return;
        }

        const documentText = editor.document.getText();
        if (!documentText || documentText.trim().length === 0) {
            this.showMessage('Document is empty', 'warning');
            return;
        }

        // Show prompt picker
        const prompts = this.promptManager.getPrompts();
        if (prompts.length === 0) {
            this.showMessage('No custom prompts available. Please create prompts in settings.', 'warning');
            return;
        }

        const promptItems = prompts.map(prompt => ({
            label: prompt.name,
            description: prompt.content.substring(0, 100) + (prompt.content.length > 100 ? '...' : ''),
            prompt
        }));

        const selectedItem = await vscode.window.showQuickPick(promptItems, {
            placeHolder: 'Select a prompt to apply to the entire document'
        });

        if (!selectedItem) {
            return; // User cancelled
        }

        // Confirm with user for large documents
        const lineCount = editor.document.lineCount;
        if (lineCount > 100) {
            const confirm = await vscode.window.showWarningMessage(
                `This document has ${lineCount} lines. Processing the entire document may take some time and consume API credits. Continue?`,
                'Yes, Continue',
                'Cancel'
            );
            
            if (confirm !== 'Yes, Continue') {
                return;
            }
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Processing entire document with "${selectedItem.prompt.name}"...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Sending request...' });

                const correctedText = await this.correctionService.processFullDocument(
                    documentText,
                    selectedItem.prompt.id,
                    editor.document.uri.toString()
                );

                progress.report({ increment: 80, message: 'Replacing document content...' });

                // Replace entire document
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(documentText.length)
                );

                await editor.edit(editBuilder => {
                    editBuilder.replace(fullRange, correctedText);
                });

                progress.report({ increment: 100, message: 'Complete!' });
            });

            this.showMessage(`Document processed successfully with "${selectedItem.prompt.name}"`, 'info');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.showMessage(`Document processing failed: ${errorMessage}`, 'error');
            this.outputChannel.appendLine(`Error in processFullDocument: ${errorMessage}`);
        }
    }

    /**
     * Updates status bar based on current selection
     */
    private updateStatusForSelection(editor: vscode.TextEditor): void {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        const activeTasks = this.correctionService.getActiveTasks();

        if (activeTasks.length > 0) {
            this.statusBarItem.text = '$(loading~spin) Processing...';
            this.statusBarItem.tooltip = `${activeTasks.length} correction task(s) in progress - Click to show chat`;
        } else if (selectedText && selectedText.trim().length > 0) {
            this.statusBarItem.text = '$(pencil) Ready to Correct';
            this.statusBarItem.tooltip = `${selectedText.length} characters selected - Click to show chat widget`;
        } else {
            this.statusBarItem.text = '$(pencil) Grammar';
            this.statusBarItem.tooltip = 'Click to show Grammar Proofreading Chat - Select text to correct';
        }
    }

    /**
     * Shows a message to the user
     */
    private showMessage(message: string, type: 'info' | 'warning' | 'error'): void {
        switch (type) {
            case 'info':
                vscode.window.showInformationMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
        }
        
        // Also log to output channel
        this.outputChannel.appendLine(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Updates the correction service instance
     */
    public updateCorrectionService(correctionService: CorrectionService): void {
        this.correctionService = correctionService;
    }

    /**
     * Updates the prompt manager instance
     */
    public updatePromptManager(promptManager: PromptManager): void {
        this.promptManager = promptManager;
        this.refreshPromptCommands();
        this.chatWidget.refreshPromptButtons();
    }

    /**
     * Updates the chat widget instance
     */
    public updateChatWidget(chatWidget: ChatWidget): void {
        this.chatWidget = chatWidget;
    }

    /**
     * Gets the list of registered prompt commands for context menus
     */
    public getPromptCommands(): Array<{ id: string; title: string; promptId: string }> {
        const prompts = this.promptManager.getPrompts();
        return prompts.map(prompt => ({
            id: `grammarProofreading.prompt.${prompt.id}`,
            title: `Correct with "${prompt.name}"`,
            promptId: prompt.id
        }));
    }

    /**
     * Generates a unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Disposes all resources
     */
    public dispose(): void {
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
        
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}