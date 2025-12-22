import * as vscode from 'vscode';
import { ChatMessage, CustomPrompt, TextSelection } from '../types';
import { CorrectionService } from '../services/CorrectionService';
import { PromptManager } from '../services/PromptManager';

/**
 * Manages the chat widget webview for interactive prompt execution and conversation history
 */
export class ChatWidget implements vscode.WebviewViewProvider {
    public static readonly viewType = 'grammarProofreading.chatWidget';
    
    private view?: vscode.WebviewView;
    private messages: ChatMessage[] = [];
    private correctionService: CorrectionService;
    private promptManager: PromptManager;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly extensionUri: vscode.Uri,
        correctionService: CorrectionService,
        promptManager: PromptManager
    ) {
        this.correctionService = correctionService;
        this.promptManager = promptManager;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken,
    ) {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'getInitialData':
                        this.sendInitialData();
                        return;
                    case 'executePrompt':
                        this.handleExecutePrompt(message.promptId);
                        return;
                    case 'clearHistory':
                        this.handleClearHistory();
                        return;
                    case 'refreshPrompts':
                        this.sendPromptButtons();
                        return;
                }
            },
            null,
            this.disposables
        );

        // Send initial data
        this.sendInitialData();
    }

    /**
     * Adds a message to the chat history and updates the UI
     */
    public addMessage(message: ChatMessage): void {
        this.messages.push(message);
        
        // Keep only the last 100 messages
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }

        this.view?.webview.postMessage({
            command: 'messageAdded',
            message
        });
    }

    /**
     * Clears the conversation history
     */
    public clearHistory(): void {
        this.messages = [];
        this.view?.webview.postMessage({
            command: 'historyCleared'
        });
    }

    /**
     * Updates the prompt buttons when prompts change
     */
    public refreshPromptButtons(): void {
        this.sendPromptButtons();
    }

    /**
     * Sets the task running state to show/hide loading indicators
     */
    public setTaskRunning(isRunning: boolean): void {
        this.view?.webview.postMessage({
            command: 'taskRunningChanged',
            isRunning
        });
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
        this.refreshPromptButtons();
    }

    public dispose(): void {
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private sendInitialData(): void {
        this.sendPromptButtons();
        this.sendMessageHistory();
    }

    private sendPromptButtons(): void {
        const prompts = this.promptManager.getPrompts();
        this.view?.webview.postMessage({
            command: 'promptButtons',
            prompts
        });
    }

    private sendMessageHistory(): void {
        this.view?.webview.postMessage({
            command: 'messageHistory',
            messages: this.messages
        });
    }

    private async handleExecutePrompt(promptId: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.addMessage({
                id: this.generateMessageId(),
                type: 'error',
                content: 'No active text editor found. Please open a document and select text to correct.',
                promptName: 'System',
                timestamp: new Date()
            });
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText || selectedText.trim().length === 0) {
            this.addMessage({
                id: this.generateMessageId(),
                type: 'error',
                content: 'No text selected. Please select text to correct.',
                promptName: 'System',
                timestamp: new Date()
            });
            return;
        }

        const prompt = this.promptManager.getPrompt(promptId);
        if (!prompt) {
            this.addMessage({
                id: this.generateMessageId(),
                type: 'error',
                content: 'Prompt not found.',
                promptName: 'System',
                timestamp: new Date()
            });
            return;
        }

        // Add request message
        this.addMessage({
            id: this.generateMessageId(),
            type: 'request',
            content: `Correcting text using "${prompt.name}":\n\n${selectedText}`,
            promptName: prompt.name,
            timestamp: new Date()
        });

        // Set task running state
        this.setTaskRunning(true);

        try {
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

            const response = await this.correctionService.executeCorrection(correctionRequest);

            // Add response message
            this.addMessage({
                id: this.generateMessageId(),
                type: 'response',
                content: response.correctedText,
                promptName: prompt.name,
                timestamp: new Date()
            });

            // Replace text in editor
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, response.correctedText);
            });

        } catch (error) {
            this.addMessage({
                id: this.generateMessageId(),
                type: 'error',
                content: error instanceof Error ? error.message : 'An unknown error occurred',
                promptName: prompt.name,
                timestamp: new Date()
            });
        } finally {
            this.setTaskRunning(false);
        }
    }

    private handleClearHistory(): void {
        this.clearHistory();
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grammar Proofreading Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .prompt-buttons {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 10px;
        }
        
        .prompt-button {
            padding: 8px 12px;
            border: none;
            border-radius: 2px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            text-align: left;
            transition: background-color 0.2s;
        }
        
        .prompt-button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .prompt-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .controls {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        }
        
        .control-button {
            padding: 6px 10px;
            border: none;
            border-radius: 2px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-family: inherit;
            font-size: 11px;
        }
        
        .control-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 2px;
            background-color: var(--vscode-panel-background);
        }
        
        .message {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .message:last-child {
            border-bottom: none;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 11px;
        }
        
        .message-type {
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 10px;
        }
        
        .message-type.request {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .message-type.response {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
        }
        
        .message-type.error {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }
        
        .message-prompt {
            color: var(--vscode-descriptionForeground);
        }
        
        .message-timestamp {
            color: var(--vscode-descriptionForeground);
        }
        
        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.4;
        }
        
        .loading-indicator {
            display: none;
            padding: 10px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .loading-indicator.visible {
            display: block;
        }
        
        .empty-state {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .no-prompts {
            padding: 10px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 2px;
            color: var(--vscode-inputValidation-warningForeground);
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .instruction {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            padding: 8px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Grammar Proofreading</div>
        
        <div class="instruction">
            Select text in the editor and click a prompt button to correct it.
        </div>
        
        <div id="noPromptsWarning" class="no-prompts" style="display: none;">
            No custom prompts available. Create prompts in the settings to get started.
        </div>
        
        <div class="prompt-buttons" id="promptButtons">
            <!-- Prompt buttons will be populated here -->
        </div>
        
        <div class="controls">
            <button class="control-button" id="refreshBtn">Refresh</button>
            <button class="control-button" id="clearBtn">Clear History</button>
        </div>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="empty-state" id="emptyState">
            No messages yet. Select text and click a prompt button to start.
        </div>
        <div class="loading-indicator" id="loadingIndicator">
            Processing correction request...
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Request initial data when page loads
        window.addEventListener('load', () => {
            vscode.postMessage({ command: 'getInitialData' });
        });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'promptButtons':
                    updatePromptButtons(message.prompts);
                    break;
                case 'messageHistory':
                    updateMessageHistory(message.messages);
                    break;
                case 'messageAdded':
                    addMessage(message.message);
                    break;
                case 'historyCleared':
                    clearMessages();
                    break;
                case 'taskRunningChanged':
                    setLoadingState(message.isRunning);
                    break;
            }
        });
        
        // Control button handlers
        document.getElementById('refreshBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'refreshPrompts' });
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'clearHistory' });
        });
        
        function updatePromptButtons(prompts) {
            const container = document.getElementById('promptButtons');
            const noPromptsWarning = document.getElementById('noPromptsWarning');
            
            container.innerHTML = '';
            
            if (prompts.length === 0) {
                noPromptsWarning.style.display = 'block';
                return;
            }
            
            noPromptsWarning.style.display = 'none';
            
            prompts.forEach(prompt => {
                const button = document.createElement('button');
                button.className = 'prompt-button';
                button.textContent = prompt.name;
                button.title = prompt.content;
                button.dataset.promptId = prompt.id;
                
                button.addEventListener('click', () => {
                    executePrompt(prompt.id);
                });
                
                container.appendChild(button);
            });
        }
        
        function executePrompt(promptId) {
            vscode.postMessage({ command: 'executePrompt', promptId });
        }
        
        function updateMessageHistory(messages) {
            const container = document.getElementById('chatContainer');
            const emptyState = document.getElementById('emptyState');
            
            // Clear existing messages (except loading indicator)
            const existingMessages = container.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            if (messages.length === 0) {
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            
            messages.forEach(message => {
                addMessageElement(message);
            });
            
            scrollToBottom();
        }
        
        function addMessage(message) {
            const emptyState = document.getElementById('emptyState');
            emptyState.style.display = 'none';
            
            addMessageElement(message);
            scrollToBottom();
        }
        
        function addMessageElement(message) {
            const container = document.getElementById('chatContainer');
            const loadingIndicator = document.getElementById('loadingIndicator');
            
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            
            const timestamp = new Date(message.timestamp).toLocaleTimeString();
            
            messageElement.innerHTML = \`
                <div class="message-header">
                    <div>
                        <span class="message-type \${message.type}">\${message.type.toUpperCase()}</span>
                        <span class="message-prompt">\${escapeHtml(message.promptName)}</span>
                    </div>
                    <div class="message-timestamp">\${timestamp}</div>
                </div>
                <div class="message-content">\${escapeHtml(message.content)}</div>
            \`;
            
            // Insert before loading indicator
            container.insertBefore(messageElement, loadingIndicator);
        }
        
        function clearMessages() {
            const container = document.getElementById('chatContainer');
            const emptyState = document.getElementById('emptyState');
            
            // Remove all message elements
            const messages = container.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            emptyState.style.display = 'block';
        }
        
        function setLoadingState(isLoading) {
            const loadingIndicator = document.getElementById('loadingIndicator');
            const promptButtons = document.querySelectorAll('.prompt-button');
            
            if (isLoading) {
                loadingIndicator.classList.add('visible');
                promptButtons.forEach(btn => btn.disabled = true);
            } else {
                loadingIndicator.classList.remove('visible');
                promptButtons.forEach(btn => btn.disabled = false);
            }
        }
        
        function scrollToBottom() {
            const container = document.getElementById('chatContainer');
            container.scrollTop = container.scrollHeight;
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }
}