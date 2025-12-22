import * as vscode from 'vscode';
import { CustomPrompt } from '../types';
import { PromptManager } from '../services/PromptManager';
import { ConfigurationProvider } from '../services/ConfigurationProvider';

/**
 * Manages the prompt settings webview panel for custom prompt and shared prompt configuration
 */
export class PromptSettingsPanel {
    public static currentPanel: PromptSettingsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private promptManager: PromptManager;
    private configProvider: ConfigurationProvider;

    public static createOrShow(
        extensionUri: vscode.Uri,
        promptManager: PromptManager,
        configProvider: ConfigurationProvider
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (PromptSettingsPanel.currentPanel) {
            PromptSettingsPanel.currentPanel.panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'promptSettings',
            'Prompt Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out', 'compiled')
                ]
            }
        );

        PromptSettingsPanel.currentPanel = new PromptSettingsPanel(
            panel,
            extensionUri,
            promptManager,
            configProvider
        );
    }

    public static kill() {
        PromptSettingsPanel.currentPanel?.dispose();
        PromptSettingsPanel.currentPanel = undefined;
    }

    public static revive(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        promptManager: PromptManager,
        configProvider: ConfigurationProvider
    ) {
        PromptSettingsPanel.currentPanel = new PromptSettingsPanel(
            panel,
            extensionUri,
            promptManager,
            configProvider
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        promptManager: PromptManager,
        configProvider: ConfigurationProvider
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.promptManager = promptManager;
        this.configProvider = configProvider;

        // Set the webview's initial html content
        this.update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'getInitialData':
                        this.sendInitialData();
                        return;
                    case 'createPrompt':
                        this.handleCreatePrompt(message.name, message.content);
                        return;
                    case 'updatePrompt':
                        this.handleUpdatePrompt(message.id, message.name, message.content);
                        return;
                    case 'deletePrompt':
                        this.handleDeletePrompt(message.id);
                        return;
                    case 'updateSharedPrompt':
                        this.handleUpdateSharedPrompt(message.content);
                        return;
                    case 'validateSharedPrompt':
                        this.handleValidateSharedPrompt(message.content);
                        return;
                    case 'previewCombination':
                        this.handlePreviewCombination(message.customPromptId);
                        return;
                }
            },
            null,
            this.disposables
        );
    }

    public dispose() {
        PromptSettingsPanel.currentPanel = undefined;

        // Clean up our resources
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async update() {
        const webview = this.panel.webview;
        this.panel.webview.html = this.getHtmlForWebview(webview);
    }

    private async sendInitialData() {
        const customPrompts = this.promptManager.getPrompts();
        const sharedPrompt = this.promptManager.getSharedPrompt();
        
        this.panel.webview.postMessage({
            command: 'initialData',
            customPrompts,
            sharedPrompt
        });
    }

    private async handleCreatePrompt(name: string, content: string) {
        try {
            const newPrompt = this.promptManager.createPrompt(name, content);
            await this.saveConfiguration();
            
            this.panel.webview.postMessage({
                command: 'promptCreated',
                prompt: newPrompt
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : 'Failed to create prompt'
            });
        }
    }

    private async handleUpdatePrompt(id: string, name: string, content: string) {
        try {
            const updatedPrompt = this.promptManager.updatePrompt(id, name, content);
            await this.saveConfiguration();
            
            this.panel.webview.postMessage({
                command: 'promptUpdated',
                prompt: updatedPrompt
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : 'Failed to update prompt'
            });
        }
    }

    private async handleDeletePrompt(id: string) {
        try {
            this.promptManager.deletePrompt(id);
            await this.saveConfiguration();
            
            this.panel.webview.postMessage({
                command: 'promptDeleted',
                id
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : 'Failed to delete prompt'
            });
        }
    }

    private async handleUpdateSharedPrompt(content: string) {
        try {
            this.promptManager.setSharedPrompt(content);
            await this.saveConfiguration();
            
            this.panel.webview.postMessage({
                command: 'sharedPromptUpdated',
                content
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : 'Failed to update shared prompt'
            });
        }
    }

    private handleValidateSharedPrompt(content: string) {
        const isValid = this.promptManager.validateSharedPrompt(content);
        const characterCount = content.length;
        
        this.panel.webview.postMessage({
            command: 'sharedPromptValidation',
            isValid,
            characterCount,
            maxLength: 2000
        });
    }

    private handlePreviewCombination(customPromptId: string) {
        try {
            const combinedPrompt = this.promptManager.combinePrompts(customPromptId);
            const customPrompt = this.promptManager.getPrompt(customPromptId);
            
            this.panel.webview.postMessage({
                command: 'combinationPreview',
                customPromptName: customPrompt?.name || 'Unknown',
                combinedPrompt
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : 'Failed to generate preview'
            });
        }
    }

    private async saveConfiguration() {
        const configuration = this.promptManager.getConfiguration();
        await this.configProvider.savePromptConfiguration(configuration);
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Settings</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-panel-background);
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-titleBar-activeForeground);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        input[type="text"], textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
            box-sizing: border-box;
        }
        
        textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        button.danger {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }
        
        .prompt-item {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
            background-color: var(--vscode-editor-background);
        }
        
        .prompt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .prompt-name {
            font-weight: bold;
            font-size: 16px;
        }
        
        .prompt-actions {
            display: flex;
            gap: 5px;
        }
        
        .prompt-content {
            margin-bottom: 10px;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 2px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
        }
        
        .character-count {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: right;
            margin-top: 5px;
        }
        
        .character-count.error {
            color: var(--vscode-errorForeground);
        }
        
        .error-message {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 2px;
            margin-bottom: 15px;
        }
        
        .success-message {
            color: var(--vscode-terminal-ansiGreen);
            background-color: var(--vscode-terminal-background);
            border: 1px solid var(--vscode-terminal-ansiGreen);
            padding: 10px;
            border-radius: 2px;
            margin-bottom: 15px;
        }
        
        .preview-section {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
        }
        
        .preview-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .preview-content {
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
        }
        
        .hidden {
            display: none;
        }
        
        .edit-form {
            margin-top: 15px;
        }
        
        .form-actions {
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Prompt Settings</h1>
        
        <!-- Error/Success Messages -->
        <div id="messages"></div>
        
        <!-- Shared Prompt Section -->
        <div class="section">
            <div class="section-title">Shared Prompt</div>
            <p>This prompt will be automatically appended to all custom prompts when making correction requests.</p>
            
            <div class="form-group">
                <label for="sharedPromptContent">Shared Prompt Content:</label>
                <textarea id="sharedPromptContent" placeholder="Enter shared prompt content (optional)..."></textarea>
                <div id="sharedPromptCount" class="character-count">0 / 2000 characters</div>
            </div>
            
            <div class="form-actions">
                <button id="saveSharedPrompt">Save Shared Prompt</button>
                <button id="previewSharedPrompt" class="secondary">Preview Combination</button>
            </div>
            
            <div id="sharedPromptPreview" class="preview-section hidden">
                <div class="preview-title">Preview: <span id="previewPromptName"></span></div>
                <div id="previewContent" class="preview-content"></div>
            </div>
        </div>
        
        <!-- Custom Prompts Section -->
        <div class="section">
            <div class="section-title">Custom Prompts</div>
            <p>Create and manage your custom correction prompts. Each prompt can be used for specific types of text corrections.</p>
            
            <!-- Add New Prompt Form -->
            <div class="form-group">
                <h3>Add New Prompt</h3>
                <div class="form-group">
                    <label for="newPromptName">Prompt Name:</label>
                    <input type="text" id="newPromptName" placeholder="Enter prompt name (1-100 characters)..." maxlength="100">
                </div>
                <div class="form-group">
                    <label for="newPromptContent">Prompt Content:</label>
                    <textarea id="newPromptContent" placeholder="Enter prompt content (1-2000 characters)..." maxlength="2000"></textarea>
                    <div id="newPromptCount" class="character-count">0 / 2000 characters</div>
                </div>
                <div class="form-actions">
                    <button id="createPrompt">Create Prompt</button>
                </div>
            </div>
            
            <!-- Existing Prompts List -->
            <div id="promptsList">
                <!-- Prompts will be populated here -->
            </div>
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
                case 'initialData':
                    populateInitialData(message.customPrompts, message.sharedPrompt);
                    break;
                case 'promptCreated':
                    addPromptToList(message.prompt);
                    clearNewPromptForm();
                    showMessage('Prompt created successfully!', 'success');
                    break;
                case 'promptUpdated':
                    updatePromptInList(message.prompt);
                    showMessage('Prompt updated successfully!', 'success');
                    break;
                case 'promptDeleted':
                    removePromptFromList(message.id);
                    showMessage('Prompt deleted successfully!', 'success');
                    break;
                case 'sharedPromptUpdated':
                    showMessage('Shared prompt updated successfully!', 'success');
                    break;
                case 'sharedPromptValidation':
                    updateSharedPromptValidation(message.isValid, message.characterCount, message.maxLength);
                    break;
                case 'combinationPreview':
                    showCombinationPreview(message.customPromptName, message.combinedPrompt);
                    break;
                case 'error':
                    showMessage(message.message, 'error');
                    break;
            }
        });
        
        // Shared prompt handling
        const sharedPromptContent = document.getElementById('sharedPromptContent');
        const sharedPromptCount = document.getElementById('sharedPromptCount');
        const saveSharedPromptBtn = document.getElementById('saveSharedPrompt');
        const previewSharedPromptBtn = document.getElementById('previewSharedPrompt');
        
        sharedPromptContent.addEventListener('input', () => {
            const content = sharedPromptContent.value;
            vscode.postMessage({ command: 'validateSharedPrompt', content });
        });
        
        saveSharedPromptBtn.addEventListener('click', () => {
            const content = sharedPromptContent.value;
            vscode.postMessage({ command: 'updateSharedPrompt', content });
        });
        
        previewSharedPromptBtn.addEventListener('click', () => {
            const prompts = document.querySelectorAll('.prompt-item');
            if (prompts.length > 0) {
                const firstPromptId = prompts[0].dataset.promptId;
                vscode.postMessage({ command: 'previewCombination', customPromptId: firstPromptId });
            } else {
                showMessage('No custom prompts available for preview', 'error');
            }
        });
        
        // New prompt form handling
        const newPromptName = document.getElementById('newPromptName');
        const newPromptContent = document.getElementById('newPromptContent');
        const newPromptCount = document.getElementById('newPromptCount');
        const createPromptBtn = document.getElementById('createPrompt');
        
        newPromptContent.addEventListener('input', () => {
            const length = newPromptContent.value.length;
            newPromptCount.textContent = \`\${length} / 2000 characters\`;
            newPromptCount.className = length > 2000 ? 'character-count error' : 'character-count';
        });
        
        createPromptBtn.addEventListener('click', () => {
            const name = newPromptName.value.trim();
            const content = newPromptContent.value.trim();
            
            if (!name || !content) {
                showMessage('Please enter both name and content for the prompt', 'error');
                return;
            }
            
            vscode.postMessage({ command: 'createPrompt', name, content });
        });
        
        function populateInitialData(customPrompts, sharedPrompt) {
            // Populate shared prompt
            sharedPromptContent.value = sharedPrompt;
            updateSharedPromptValidation(true, sharedPrompt.length, 2000);
            
            // Populate custom prompts
            const promptsList = document.getElementById('promptsList');
            promptsList.innerHTML = '';
            
            customPrompts.forEach(prompt => {
                addPromptToList(prompt);
            });
        }
        
        function addPromptToList(prompt) {
            const promptsList = document.getElementById('promptsList');
            const promptElement = createPromptElement(prompt);
            promptsList.appendChild(promptElement);
        }
        
        function updatePromptInList(prompt) {
            const existingElement = document.querySelector(\`[data-prompt-id="\${prompt.id}"]\`);
            if (existingElement) {
                const newElement = createPromptElement(prompt);
                existingElement.replaceWith(newElement);
            }
        }
        
        function removePromptFromList(promptId) {
            const element = document.querySelector(\`[data-prompt-id="\${promptId}"]\`);
            if (element) {
                element.remove();
            }
        }
        
        function createPromptElement(prompt) {
            const div = document.createElement('div');
            div.className = 'prompt-item';
            div.dataset.promptId = prompt.id;
            
            div.innerHTML = \`
                <div class="prompt-header">
                    <div class="prompt-name">\${escapeHtml(prompt.name)}</div>
                    <div class="prompt-actions">
                        <button class="secondary edit-btn">Edit</button>
                        <button class="secondary preview-btn">Preview</button>
                        <button class="danger delete-btn">Delete</button>
                    </div>
                </div>
                <div class="prompt-content">\${escapeHtml(prompt.content)}</div>
                <div class="edit-form hidden">
                    <div class="form-group">
                        <label>Prompt Name:</label>
                        <input type="text" class="edit-name" value="\${escapeHtml(prompt.name)}" maxlength="100">
                    </div>
                    <div class="form-group">
                        <label>Prompt Content:</label>
                        <textarea class="edit-content" maxlength="2000">\${escapeHtml(prompt.content)}</textarea>
                        <div class="character-count edit-count">\${prompt.content.length} / 2000 characters</div>
                    </div>
                    <div class="form-actions">
                        <button class="save-btn">Save</button>
                        <button class="secondary cancel-btn">Cancel</button>
                    </div>
                </div>
            \`;
            
            // Add event listeners
            const editBtn = div.querySelector('.edit-btn');
            const deleteBtn = div.querySelector('.delete-btn');
            const previewBtn = div.querySelector('.preview-btn');
            const saveBtn = div.querySelector('.save-btn');
            const cancelBtn = div.querySelector('.cancel-btn');
            const editContent = div.querySelector('.edit-content');
            const editCount = div.querySelector('.edit-count');
            
            editBtn.addEventListener('click', () => toggleEditMode(div, true));
            cancelBtn.addEventListener('click', () => toggleEditMode(div, false));
            deleteBtn.addEventListener('click', () => deletePrompt(prompt.id));
            previewBtn.addEventListener('click', () => previewPrompt(prompt.id));
            saveBtn.addEventListener('click', () => savePromptEdit(div, prompt.id));
            
            editContent.addEventListener('input', () => {
                const length = editContent.value.length;
                editCount.textContent = \`\${length} / 2000 characters\`;
                editCount.className = length > 2000 ? 'character-count error' : 'character-count';
            });
            
            return div;
        }
        
        function toggleEditMode(promptElement, isEditing) {
            const content = promptElement.querySelector('.prompt-content');
            const editForm = promptElement.querySelector('.edit-form');
            const actions = promptElement.querySelector('.prompt-actions');
            
            if (isEditing) {
                content.classList.add('hidden');
                editForm.classList.remove('hidden');
                actions.classList.add('hidden');
            } else {
                content.classList.remove('hidden');
                editForm.classList.add('hidden');
                actions.classList.remove('hidden');
            }
        }
        
        function savePromptEdit(promptElement, promptId) {
            const editName = promptElement.querySelector('.edit-name');
            const editContent = promptElement.querySelector('.edit-content');
            
            const name = editName.value.trim();
            const content = editContent.value.trim();
            
            if (!name || !content) {
                showMessage('Please enter both name and content for the prompt', 'error');
                return;
            }
            
            vscode.postMessage({ command: 'updatePrompt', id: promptId, name, content });
            toggleEditMode(promptElement, false);
        }
        
        function deletePrompt(promptId) {
            if (confirm('Are you sure you want to delete this prompt?')) {
                vscode.postMessage({ command: 'deletePrompt', id: promptId });
            }
        }
        
        function previewPrompt(promptId) {
            vscode.postMessage({ command: 'previewCombination', customPromptId: promptId });
        }
        
        function clearNewPromptForm() {
            newPromptName.value = '';
            newPromptContent.value = '';
            newPromptCount.textContent = '0 / 2000 characters';
            newPromptCount.className = 'character-count';
        }
        
        function updateSharedPromptValidation(isValid, characterCount, maxLength) {
            sharedPromptCount.textContent = \`\${characterCount} / \${maxLength} characters\`;
            sharedPromptCount.className = isValid ? 'character-count' : 'character-count error';
        }
        
        function showCombinationPreview(customPromptName, combinedPrompt) {
            const previewSection = document.getElementById('sharedPromptPreview');
            const previewPromptName = document.getElementById('previewPromptName');
            const previewContent = document.getElementById('previewContent');
            
            previewPromptName.textContent = customPromptName;
            previewContent.textContent = combinedPrompt;
            previewSection.classList.remove('hidden');
        }
        
        function showMessage(message, type) {
            const messagesDiv = document.getElementById('messages');
            const messageElement = document.createElement('div');
            messageElement.className = type === 'error' ? 'error-message' : 'success-message';
            messageElement.textContent = message;
            
            messagesDiv.appendChild(messageElement);
            
            // Remove message after 5 seconds
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
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