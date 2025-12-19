import * as vscode from 'vscode';
import { NamePromptPair } from '../models/NamePromptPair';
import { ConfigurationProvider } from '../services/ConfigurationProvider';

export class CorrectionButtonProvider {
    private configProvider: ConfigurationProvider;
    private onButtonClickCallback?: (promptName: string, prompt: string) => void;

    constructor() {
        this.configProvider = new ConfigurationProvider();
    }

    /**
     * Gets all available name-prompt pairs (default + custom)
     */
    public getAllNamePromptPairs(): NamePromptPair[] {
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
            } else {
                // Add new custom pair
                allPairs.push(customPair);
            }
        }

        return allPairs;
    }

    /**
     * Gets name-prompt pairs for button generation
     */
    public getButtonConfigurations(): Array<{
        name: string;
        prompt: string;
        description?: string;
        id: string;
    }> {
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
    public registerCommands(context: vscode.ExtensionContext): void {
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
    private async showCustomPromptPicker(): Promise<void> {
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
    public onButtonClick(callback: (promptName: string, prompt: string) => void): void {
        this.onButtonClickCallback = callback;
    }

    /**
     * Updates button configurations when settings change
     */
    public refreshButtons(): NamePromptPair[] {
        return this.getAllNamePromptPairs();
    }

    /**
     * Validates button configuration
     */
    public validateButtonConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
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
    public getButtonByName(name: string): NamePromptPair | undefined {
        const pairs = this.getAllNamePromptPairs();
        return pairs.find(pair => pair.name === name);
    }

    /**
     * Gets button configuration by ID
     */
    public getButtonById(id: string): NamePromptPair | undefined {
        const pairs = this.getAllNamePromptPairs();
        return pairs.find(pair => pair.id === id);
    }

    /**
     * Creates menu contributions for context menu
     */
    public getMenuContributions(): Array<{
        command: string;
        title: string;
        category: string;
    }> {
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
    public getStatusBarItems(): Array<{
        text: string;
        tooltip: string;
        command: string;
    }> {
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

    private truncatePrompt(prompt: string, maxLength: number = 50): string {
        if (prompt.length <= maxLength) {
            return prompt;
        }
        return prompt.substring(0, maxLength) + '...';
    }

    // Legacy methods for backward compatibility
    static createQuickPickItems(): vscode.QuickPickItem[] {
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

    static async showCorrectionPicker(): Promise<string | undefined> {
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
            } else if (label.includes('style')) {
                return 'grammarProofreading.correctStyle';
            } else if (label.includes('clarity')) {
                return 'grammarProofreading.correctClarity';
            } else if (label.includes('tone')) {
                return 'grammarProofreading.correctTone';
            } else if (label.includes('custom')) {
                return 'grammarProofreading.correctCustom';
            }
        }

        return undefined;
    }
}