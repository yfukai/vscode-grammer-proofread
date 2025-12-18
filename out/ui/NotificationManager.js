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
exports.NotificationManager = void 0;
const vscode = __importStar(require("vscode"));
class NotificationManager {
    async showCorrectionSuccess(response) {
        let message = `✅ Correction completed successfully!`;
        if (response.changes && response.changes.length > 0) {
            message += ` Made ${response.changes.length} change${response.changes.length > 1 ? 's' : ''}.`;
        }
        const action = await vscode.window.showInformationMessage(message, 'View Details', 'Undo');
        if (action === 'View Details') {
            await this.showDetailedExplanation(response);
        }
        else if (action === 'Undo') {
            await vscode.commands.executeCommand('undo');
        }
    }
    async showDetailedExplanation(response) {
        const panel = vscode.window.createWebviewPanel('correctionDetails', 'Correction Details', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.generateDetailedHtml(response);
    }
    generateDetailedHtml(response) {
        const changesHtml = response.changes?.map((change, index) => `
            <div class="change-item">
                <h4>Change ${index + 1}</h4>
                <div class="change-content">
                    <div class="original">
                        <strong>Original:</strong> "${change.original}"
                    </div>
                    <div class="corrected">
                        <strong>Corrected:</strong> "${change.corrected}"
                    </div>
                    <div class="reason">
                        <strong>Reason:</strong> ${change.reason}
                    </div>
                </div>
            </div>
        `).join('') || '<p>No specific changes tracked.</p>';
        const confidenceColor = response.confidence >= 0.8 ? '#4CAF50' :
            response.confidence >= 0.6 ? '#FF9800' : '#F44336';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Correction Details</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .explanation {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .confidence {
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 4px;
                        color: white;
                        font-weight: bold;
                        background-color: ${confidenceColor};
                    }
                    .change-item {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 15px;
                        margin: 15px 0;
                    }
                    .change-content div {
                        margin: 8px 0;
                    }
                    .original {
                        color: var(--vscode-gitDecoration-deletedResourceForeground);
                    }
                    .corrected {
                        color: var(--vscode-gitDecoration-addedResourceForeground);
                    }
                    .reason {
                        font-style: italic;
                        color: var(--vscode-descriptionForeground);
                    }
                    h1, h2, h3, h4 {
                        color: var(--vscode-titleBar-activeForeground);
                    }
                </style>
            </head>
            <body>
                <h1>Correction Details</h1>
                
                <div class="explanation">
                    <h3>Explanation</h3>
                    <p>${response.explanation}</p>
                </div>

                ${response.confidence !== undefined ? `
                <p><strong>Confidence:</strong> <span class="confidence">${Math.round(response.confidence * 100)}%</span></p>
                ` : ''}

                <h3>Changes Made</h3>
                ${changesHtml}
            </body>
            </html>
        `;
    }
    async showError(error) {
        const action = await vscode.window.showErrorMessage(`❌ Grammar correction failed: ${error}`, 'Retry', 'Open Settings');
        if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading');
        }
    }
    async showWarning(message) {
        await vscode.window.showWarningMessage(`⚠️ ${message}`);
    }
    async showConfigurationError(errors) {
        const message = `Configuration issues found:\n${errors.join('\n')}`;
        const action = await vscode.window.showErrorMessage(message, 'Open Settings', 'Dismiss');
        if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading');
        }
    }
    async showNoTextWarning() {
        await vscode.window.showWarningMessage('No text selected or available in the active editor. Please select text or open a document with content.');
    }
    async showApiKeyMissingError() {
        const action = await vscode.window.showErrorMessage('API key is not configured. Please set your OpenAI-compatible API key in the extension settings.', 'Open Settings');
        if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading.apiKey');
        }
    }
    async confirmLargeTextCorrection(textLength) {
        const action = await vscode.window.showWarningMessage(`You're about to correct ${textLength} characters of text. This may take longer and use more API tokens. Continue?`, 'Yes, Continue', 'Cancel');
        return action === 'Yes, Continue';
    }
    showProgress(message) {
        return vscode.window.setStatusBarMessage(`$(sync~spin) ${message}`, 10000);
    }
}
exports.NotificationManager = NotificationManager;
//# sourceMappingURL=NotificationManager.js.map