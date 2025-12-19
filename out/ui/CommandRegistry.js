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
exports.CommandRegistry = void 0;
const vscode = __importStar(require("vscode"));
const CorrectionService_1 = require("../services/CorrectionService");
class CommandRegistry {
    constructor() {
        this.correctionService = new CorrectionService_1.CorrectionService();
    }
    registerCommands(context) {
        // Register default correction commands using built-in name-prompt pairs
        const grammarCommand = vscode.commands.registerCommand('grammarProofreading.correctGrammar', () => this.handleCorrectionCommand('Grammar'));
        const styleCommand = vscode.commands.registerCommand('grammarProofreading.correctStyle', () => this.handleCorrectionCommand('Style'));
        const clarityCommand = vscode.commands.registerCommand('grammarProofreading.correctClarity', () => this.handleCorrectionCommand('Clarity'));
        const toneCommand = vscode.commands.registerCommand('grammarProofreading.correctTone', () => this.handleCorrectionCommand('Tone'));
        // Register custom correction command
        const customCommand = vscode.commands.registerCommand('grammarProofreading.correctCustom', () => this.handleCustomCorrectionCommand());
        // Register configuration command
        const configCommand = vscode.commands.registerCommand('grammarProofreading.openSettings', () => this.openSettings());
        // Add all commands to context subscriptions
        context.subscriptions.push(grammarCommand, styleCommand, clarityCommand, toneCommand, customCommand, configCommand);
    }
    async handleCorrectionCommand(promptName) {
        try {
            const result = await this.correctionService.performCorrectionByName(promptName);
            if (!result.success) {
                vscode.window.showErrorMessage(`Correction failed: ${result.error}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Correction failed: ${errorMessage}`);
        }
    }
    async handleCustomCorrectionCommand() {
        try {
            // Get all available name-prompt pairs
            const namePromptPairs = this.correctionService.getAllNamePromptPairs();
            if (namePromptPairs.length === 0) {
                vscode.window.showWarningMessage('No custom prompts configured. Please add some in settings.');
                return;
            }
            // Show quick pick for available prompts
            const items = namePromptPairs.map(pair => ({
                label: pair.name,
                description: pair.description || '',
                detail: pair.prompt.substring(0, 100) + (pair.prompt.length > 100 ? '...' : ''),
                pair
            }));
            items.push({
                label: '$(add) Create Custom Prompt...',
                description: 'Enter a one-time custom prompt',
                detail: 'Use a custom prompt without saving it',
                pair: null
            });
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a correction type or create a custom prompt',
                matchOnDescription: true,
                matchOnDetail: true
            });
            if (!selected) {
                return;
            }
            if (selected.pair) {
                // Use existing name-prompt pair
                const result = await this.correctionService.performCorrectionById(selected.pair.id);
                if (!result.success) {
                    vscode.window.showErrorMessage(`Correction failed: ${result.error}`);
                }
            }
            else {
                // Create custom prompt
                const customPrompt = await vscode.window.showInputBox({
                    prompt: 'Enter your custom correction instructions',
                    placeHolder: 'e.g., Make this text more formal and professional',
                    validateInput: (value) => {
                        if (!value || value.trim() === '') {
                            return 'Please enter correction instructions';
                        }
                        return null;
                    }
                });
                if (customPrompt) {
                    // Use the first available name-prompt pair as a base, but with custom prompt
                    const firstPair = namePromptPairs[0];
                    const result = await this.correctionService.performCorrectionById(firstPair.id, customPrompt);
                    if (!result.success) {
                        vscode.window.showErrorMessage(`Correction failed: ${result.error}`);
                    }
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Custom correction failed: ${errorMessage}`);
        }
    }
    openSettings() {
        vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading');
    }
}
exports.CommandRegistry = CommandRegistry;
//# sourceMappingURL=CommandRegistry.js.map