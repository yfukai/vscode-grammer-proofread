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
exports.ChatWidget = void 0;
const vscode = __importStar(require("vscode"));
class ChatWidget {
    constructor(context, namePromptPairs = []) {
        this.context = context;
        this.namePromptPairs = namePromptPairs;
        this.conversationHistory = {
            messages: [],
            sessionId: this.generateSessionId(),
            createdAt: new Date(),
            lastActivity: new Date()
        };
    }
    show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        this.panel = vscode.window.createWebviewPanel('grammarProofreadingChat', 'Grammar Proofreading Chat', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [this.context.extensionUri]
        });
        this.panel.webview.html = this.getWebviewContent();
        this.setupWebviewMessageHandling();
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
        // Send initial data to webview
        this.updateWebview();
    }
    hide() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
    isVisible() {
        return this.panel !== undefined;
    }
    addMessage(message) {
        this.conversationHistory.messages.push(message);
        this.conversationHistory.lastActivity = new Date();
        this.updateWebview();
    }
    updateNamePromptPairs(pairs) {
        this.namePromptPairs = pairs;
        this.updateWebview();
    }
    getConversationHistory() {
        return { ...this.conversationHistory };
    }
    clearHistory() {
        this.conversationHistory.messages = [];
        this.conversationHistory.lastActivity = new Date();
        this.updateWebview();
    }
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
    onAction(callback) {
        this.onActionCallback = callback;
    }
    setupWebviewMessageHandling() {
        if (!this.panel)
            return;
        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'promptButtonClicked':
                    this.handlePromptButtonClick(message.promptName);
                    break;
                case 'actionButtonClicked':
                    this.handleActionButtonClick(message.action, message.messageId);
                    break;
                case 'ready':
                    this.updateWebview();
                    break;
            }
        }, undefined, this.context.subscriptions);
    }
    handlePromptButtonClick(promptName) {
        const userMessage = {
            id: this.generateMessageId(),
            type: 'user',
            content: `Requesting ${promptName} correction...`,
            timestamp: new Date(),
            promptName
        };
        this.addMessage(userMessage);
        if (this.onMessageCallback) {
            this.onMessageCallback(userMessage);
        }
    }
    handleActionButtonClick(action, messageId) {
        if (this.onActionCallback) {
            this.onActionCallback(action, messageId);
        }
    }
    updateWebview() {
        if (!this.panel)
            return;
        this.panel.webview.postMessage({
            command: 'updateData',
            data: {
                messages: this.conversationHistory.messages,
                namePromptPairs: this.namePromptPairs
            }
        });
    }
    getWebviewContent() {
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
            padding: 16px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .buttons-section {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .buttons-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
        }

        .prompt-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .prompt-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .messages-section {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            padding: 12px;
            border-radius: 8px;
            max-width: 85%;
        }

        .message.user {
            align-self: flex-end;
            background-color: var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-input-foreground);
        }

        .message.assistant {
            align-self: flex-start;
            background-color: var(--vscode-editor-selectionBackground);
            color: var(--vscode-editor-foreground);
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 11px;
            opacity: 0.8;
        }

        .message-content {
            line-height: 1.4;
            white-space: pre-wrap;
        }

        .message-actions {
            margin-top: 8px;
            display: flex;
            gap: 6px;
        }

        .action-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .action-button.apply {
            background-color: var(--vscode-inputValidation-infoBackground);
        }

        .action-button.dismiss {
            background-color: var(--vscode-inputValidation-warningBackground);
        }

        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-top: 32px;
        }

        .selection-indicator {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="buttons-section">
            <div class="buttons-grid" id="buttonsGrid">
                <!-- Buttons will be populated by JavaScript -->
            </div>
        </div>
        
        <div class="messages-section" id="messagesSection">
            <div class="empty-state" id="emptyState">
                Click a correction button above to start a conversation with the AI assistant.
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentData = { messages: [], namePromptPairs: [] };

        // Notify that webview is ready
        vscode.postMessage({ command: 'ready' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateData':
                    currentData = message.data;
                    updateUI();
                    break;
            }
        });

        function updateUI() {
            updateButtons();
            updateMessages();
        }

        function updateButtons() {
            const buttonsGrid = document.getElementById('buttonsGrid');
            buttonsGrid.innerHTML = '';

            currentData.namePromptPairs.forEach(pair => {
                const button = document.createElement('button');
                button.className = 'prompt-button';
                button.textContent = pair.name;
                button.title = pair.description || pair.prompt;
                button.onclick = () => handlePromptButtonClick(pair.name);
                buttonsGrid.appendChild(button);
            });
        }

        function updateMessages() {
            const messagesSection = document.getElementById('messagesSection');
            const emptyState = document.getElementById('emptyState');

            if (currentData.messages.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            
            // Clear existing messages
            messagesSection.innerHTML = '';

            currentData.messages.forEach(message => {
                const messageElement = createMessageElement(message);
                messagesSection.appendChild(messageElement);
            });

            // Scroll to bottom
            messagesSection.scrollTop = messagesSection.scrollHeight;
        }

        function createMessageElement(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.type}\`;

            const header = document.createElement('div');
            header.className = 'message-header';
            
            const typeLabel = message.type === 'user' ? 'You' : 'AI Assistant';
            const timestamp = new Date(message.timestamp).toLocaleTimeString();
            
            header.innerHTML = \`
                <span>\${typeLabel}\${message.promptName ? \` (\${message.promptName})\` : ''}</span>
                <span>\${timestamp}</span>
            \`;

            const content = document.createElement('div');
            content.className = 'message-content';
            content.textContent = message.content;

            messageDiv.appendChild(header);
            messageDiv.appendChild(content);

            // Add selection indicator if applicable
            if (message.isSelection && message.selectionRange) {
                const selectionIndicator = document.createElement('div');
                selectionIndicator.className = 'selection-indicator';
                selectionIndicator.textContent = \`Selection: characters \${message.selectionRange.start}-\${message.selectionRange.end}\`;
                messageDiv.appendChild(selectionIndicator);
            }

            // Add action buttons if present
            if (message.actions && message.actions.length > 0) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';

                message.actions.forEach(action => {
                    const button = document.createElement('button');
                    button.className = \`action-button \${action.type}\`;
                    button.textContent = action.label;
                    button.onclick = () => handleActionButtonClick(action, message.id);
                    actionsDiv.appendChild(button);
                });

                messageDiv.appendChild(actionsDiv);
            }

            return messageDiv;
        }

        function handlePromptButtonClick(promptName) {
            vscode.postMessage({
                command: 'promptButtonClicked',
                promptName: promptName
            });
        }

        function handleActionButtonClick(action, messageId) {
            vscode.postMessage({
                command: 'actionButtonClicked',
                action: action,
                messageId: messageId
            });
        }
    </script>
</body>
</html>`;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ChatWidget = ChatWidget;
//# sourceMappingURL=ChatWidget.js.map