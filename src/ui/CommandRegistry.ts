import * as vscode from 'vscode';
import { CorrectionType } from '../models/CorrectionType';
import { CorrectionService } from '../services/CorrectionService';

export class CommandRegistry {
    private correctionService: CorrectionService;

    constructor() {
        this.correctionService = new CorrectionService();
    }

    registerCommands(context: vscode.ExtensionContext): void {
        // Register grammar correction command
        const grammarCommand = vscode.commands.registerCommand(
            'grammarProofreading.correctGrammar',
            () => this.handleCorrectionCommand(CorrectionType.GRAMMAR)
        );

        // Register style correction command
        const styleCommand = vscode.commands.registerCommand(
            'grammarProofreading.correctStyle',
            () => this.handleCorrectionCommand(CorrectionType.STYLE)
        );

        // Register clarity correction command
        const clarityCommand = vscode.commands.registerCommand(
            'grammarProofreading.correctClarity',
            () => this.handleCorrectionCommand(CorrectionType.CLARITY)
        );

        // Register tone correction command
        const toneCommand = vscode.commands.registerCommand(
            'grammarProofreading.correctTone',
            () => this.handleCorrectionCommand(CorrectionType.TONE)
        );

        // Register custom correction command
        const customCommand = vscode.commands.registerCommand(
            'grammarProofreading.correctCustom',
            () => this.handleCustomCorrectionCommand()
        );

        // Register configuration command
        const configCommand = vscode.commands.registerCommand(
            'grammarProofreading.openSettings',
            () => this.openSettings()
        );

        // Add all commands to context subscriptions
        context.subscriptions.push(
            grammarCommand,
            styleCommand,
            clarityCommand,
            toneCommand,
            customCommand,
            configCommand
        );
    }

    private async handleCorrectionCommand(correctionType: CorrectionType): Promise<void> {
        try {
            const result = await this.correctionService.performCorrection(correctionType);
            
            if (!result.success) {
                vscode.window.showErrorMessage(`Correction failed: ${result.error}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Correction failed: ${errorMessage}`);
        }
    }

    private async handleCustomCorrectionCommand(): Promise<void> {
        try {
            // Prompt user for custom correction prompt
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
                const result = await this.correctionService.performCorrection(
                    CorrectionType.CUSTOM, 
                    customPrompt
                );
                
                if (!result.success) {
                    vscode.window.showErrorMessage(`Correction failed: ${result.error}`);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Custom correction failed: ${errorMessage}`);
        }
    }

    private openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'grammarProofreading');
    }
}