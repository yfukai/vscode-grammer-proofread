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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    initialize(context) {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
    updateStatus() {
        if (!this.statusBarItem) {
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.statusBarItem.text = '$(pencil) Grammar';
            this.statusBarItem.tooltip = 'Grammar Proofreading Extension - Ready to correct text';
            this.statusBarItem.color = undefined;
        }
        else {
            this.statusBarItem.text = '$(pencil) Grammar';
            this.statusBarItem.tooltip = 'Grammar Proofreading Extension - No active editor';
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        }
    }
    showProgress(message) {
        if (this.statusBarItem) {
            this.statusBarItem.text = `$(sync~spin) ${message}`;
            this.statusBarItem.tooltip = 'Grammar correction in progress...';
        }
    }
    hideProgress() {
        this.updateStatus();
    }
    dispose() {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=StatusBarManager.js.map