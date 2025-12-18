import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem | undefined;

    initialize(context: vscode.ExtensionContext): void {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        this.statusBarItem.text = '$(pencil) Grammar';
        this.statusBarItem.tooltip = 'Grammar Proofreading Extension - Click to open settings';
        this.statusBarItem.command = 'grammarProofreading.openSettings';
        
        // Show the status bar item
        this.statusBarItem.show();

        // Add to context subscriptions for proper cleanup
        context.subscriptions.push(this.statusBarItem);

        // Listen for active editor changes to update status
        const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateStatus();
        });

        context.subscriptions.push(editorChangeListener);

        // Initial status update
        this.updateStatus();
    }

    private updateStatus(): void {
        if (!this.statusBarItem) {
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        
        if (activeEditor) {
            this.statusBarItem.text = '$(pencil) Grammar';
            this.statusBarItem.tooltip = 'Grammar Proofreading Extension - Ready to correct text';
            this.statusBarItem.color = undefined;
        } else {
            this.statusBarItem.text = '$(pencil) Grammar';
            this.statusBarItem.tooltip = 'Grammar Proofreading Extension - No active editor';
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        }
    }

    showProgress(message: string): void {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(sync~spin) ${message}`;
            this.statusBarItem.tooltip = 'Grammar correction in progress...';
        }
    }

    hideProgress(): void {
        this.updateStatus();
    }

    dispose(): void {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }
}