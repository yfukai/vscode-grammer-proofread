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
exports.CorrectionButtonProvider = void 0;
const vscode = __importStar(require("vscode"));
const ConfigurationProvider_1 = require("../services/ConfigurationProvider");
class CorrectionButtonProvider {
    constructor() {
        this.configProvider = new ConfigurationProvider_1.ConfigurationProvider();
    }
    /**
     * Gets all available name-prompt pairs (default + custom)
     */
    getAllNamePromptPairs() {
        const defaultPairs = this.configProvider.getDefaultNamePromptPairs();
        const config = this.configProvider.getConfiguration();
        const customPairs = config.customPrompts || [];
        // Combine default and custom pairs, with custom pairs taking precedence for duplicate names
        const allPairs = [...defaultPairs];
        for (const customPair of customPairs) {
            const existingIndex = allPairs.findIndex(pair => pair.name === customPair.name);
            if (existingIndex >= 0) {
                // Replace default with custom
                allPairs[existingIndex] = customPair;
            }
            else {
                // Add new custom pair
                allPairs.push(customPair);
            }
        }
        return allPairs;
    }
    /**
     * Gets name-prompt pairs for button generation
     */
    getButtonConfigurations() {
        const pairs = this.getAllNamePromptPairs();
        return pairs.map(pair => ({
            name: pair.name,
            prompt: pair.prompt,
            description: pair.description,
            id: pair.id
        }));
    }
    /**
     * Creates VSCode commands for correction buttons
     */
    registerCommands(context) {
        const pairs = this.getAllNamePromptPairs();
        // Register a command for each name-prompt pair
        pairs.forEach(pair => {
            const commandId = `grammarProofreading.correct${pair.id}`;
            const command = vscode.commands.registerCommand(commandId, () => {
                if (this.onButtonClickCallback) {
                    this.onButtonClickCallback(pair.name, pair.prompt);
                }
            });
            context.subscriptions.push(command);
        });
        // Register a generic custom correction command
        const customCommand = vscode.commands.registerCommand('grammarProofreading.correctCustom', () => {
            this.showCustomPromptPicker();
        });
        context.subscriptions.push(customCommand);
    }
    /**
     * Shows a quick pick for custom prompts
     */
    async showCustomPromptPicker() {
        const pairs = this.getAllNamePromptPairs();
        if (pairs.length === 0) {
            vscode.window.showInformationMessage('No correction prompts configured. Please configure prompts in settings.');
            return;
        }
        const items = pairs.map(pair => ({
            label: pair.name,
            description: pair.description || this.truncatePrompt(pair.prompt),
            detail: `ID: ${pair.id}`,
            pair
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a correction type',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (selected && this.onButtonClickCallback) {
            this.onButtonClickCallback(selected.pair.name, selected.pair.prompt);
        }
    }
    /**
     * Sets callback for button clicks
     */
    onButtonClick(callback) {
        this.onButtonClickCallback = callback;
    }
    /**
     * Updates button configurations when settings change
     */
    refreshButtons() {
        return this.getAllNamePromptPairs();
    }
    /**
     * Validates button configuration
     */
    validateButtonConfiguration() {
        const errors = [];
        const pairs = this.getAllNamePromptPairs();
        if (pairs.length === 0) {
            errors.push('No correction buttons configured');
        }
        // Check for duplicate names
        const names = pairs.map(pair => pair.name.toLowerCase());
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
            errors.push(`Duplicate button names found: ${[...new Set(duplicates)].join(', ')}`);
        }
        // Validate each pair
        pairs.forEach((pair, index) => {
            if (!pair.name || pair.name.trim() === '') {
                errors.push(`Button at index ${index} has empty name`);
            }
            if (!pair.prompt || pair.prompt.trim() === '') {
                errors.push(`Button "${pair.name}" has empty prompt`);
            }
            if (!pair.id || pair.id.trim() === '') {
                errors.push(`Button "${pair.name}" has empty ID`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Gets button configuration by name
     */
    getButtonByName(name) {
        const pairs = this.getAllNamePromptPairs();
        return pairs.find(pair => pair.name === name);
    }
    /**
     * Gets button configuration by ID
     */
    getButtonById(id) {
        const pairs = this.getAllNamePromptPairs();
        return pairs.find(pair => pair.id === id);
    }
    /**
     * Creates menu contributions for context menu
     */
    getMenuContributions() {
        const pairs = this.getAllNamePromptPairs();
        return pairs.map(pair => ({
            command: `grammarProofreading.correct${pair.id}`,
            title: `Correct ${pair.name}`,
            category: 'Grammar Proofreading'
        }));
    }
    /**
     * Gets status bar items for correction buttons
     */
    getStatusBarItems() {
        const pairs = this.getAllNamePromptPairs();
        // Only show first few items in status bar to avoid clutter
        const maxStatusBarItems = 3;
        const displayPairs = pairs.slice(0, maxStatusBarItems);
        return displayPairs.map(pair => ({
            text: `$(edit) ${pair.name}`,
            tooltip: `Grammar Proofreading: ${pair.name}\n${pair.description || pair.prompt}`,
            command: `grammarProofreading.correct${pair.id}`
        }));
    }
    truncatePrompt(prompt, maxLength = 50) {
        if (prompt.length <= maxLength) {
            return prompt;
        }
        return prompt.substring(0, maxLength) + '...';
    }
    // Legacy methods for backward compatibility
    static createQuickPickItems() {
        return [
            {
                label: '$(check) Grammar',
                description: 'Correct grammatical errors',
                detail: 'Fix grammar, punctuation, and sentence structure'
            },
            {
                label: '$(paintcan) Style',
                description: 'Improve writing style',
                detail: 'Enhance word choice, flow, and readability'
            },
            {
                label: '$(lightbulb) Clarity',
                description: 'Improve clarity',
                detail: 'Simplify complex sentences and remove ambiguity'
            },
            {
                label: '$(comment) Tone',
                description: 'Adjust tone',
                detail: 'Ensure appropriate and consistent tone'
            },
            {
                label: '$(edit) Custom',
                description: 'Custom correction',
                detail: 'Provide your own correction instructions'
            }
        ];
    }
    static async showCorrectionPicker() {
        const items = this.createQuickPickItems();
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select the type of correction to apply',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (selected) {
            // Extract the command from the label
            const label = selected.label.toLowerCase();
            if (label.includes('grammar')) {
                return 'grammarProofreading.correctGrammar';
            }
            else if (label.includes('style')) {
                return 'grammarProofreading.correctStyle';
            }
            else if (label.includes('clarity')) {
                return 'grammarProofreading.correctClarity';
            }
            else if (label.includes('tone')) {
                return 'grammarProofreading.correctTone';
            }
            else if (label.includes('custom')) {
                return 'grammarProofreading.correctCustom';
            }
        }
        return undefined;
    }
}
exports.CorrectionButtonProvider = CorrectionButtonProvider;
//# sourceMappingURL=CorrectionButtonProvider.js.map