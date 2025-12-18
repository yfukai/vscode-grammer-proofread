import * as vscode from 'vscode';
import { CorrectionType } from '../models/CorrectionType';
import { CorrectionRequest } from '../models/CorrectionRequest';
import { CorrectionResponse } from '../models/CorrectionResponse';
import { ConfigurationProvider } from './ConfigurationProvider';
import { TextProcessor } from './TextProcessor';
import { LLMApiClient } from './LLMApiClient';

export class CorrectionService {
    private configProvider: ConfigurationProvider;
    private textProcessor: TextProcessor;
    private apiClient: LLMApiClient;

    constructor() {
        this.configProvider = new ConfigurationProvider();
        this.textProcessor = new TextProcessor();
        this.apiClient = new LLMApiClient();
    }

    async performCorrection(correctionType: CorrectionType, customPrompt?: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Get configuration
            const config = this.configProvider.getConfiguration();
            const configValidation = this.configProvider.validateConfiguration(config);
            
            if (!configValidation.isValid) {
                return { 
                    success: false, 
                    error: `Configuration error: ${configValidation.errors.join(', ')}` 
                };
            }

            // Capture text from editor
            const textCapture = this.textProcessor.captureEditorText();
            if (!textCapture.success) {
                return { success: false, error: textCapture.error };
            }

            // Show progress
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Applying ${correctionType} correction...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 25, message: 'Preparing request...' });

                // Build correction request
                const correctionRequest: CorrectionRequest = {
                    text: textCapture.text!,
                    prompt: customPrompt || '',
                    correctionType,
                    apiEndpoint: config.apiEndpoint,
                    apiKey: config.apiKey
                };

                progress.report({ increment: 25, message: 'Sending to API...' });

                // Send to API
                const apiResult = await this.apiClient.sendCorrectionRequest(correctionRequest, config);
                if (!apiResult.success) {
                    return { success: false, error: apiResult.error };
                }

                progress.report({ increment: 25, message: 'Processing response...' });

                // Replace text in editor
                const replaceResult = await this.textProcessor.replaceEditorText(apiResult.data!.correctedText);
                if (!replaceResult.success) {
                    return { success: false, error: replaceResult.error };
                }

                progress.report({ increment: 25, message: 'Showing explanation...' });

                // Show explanation
                await this.showCorrectionExplanation(apiResult.data!);

                return { success: true };
            });

        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    private async showCorrectionExplanation(response: CorrectionResponse): Promise<void> {
        let message = `Correction completed!\n\n${response.explanation}`;
        
        if (response.changes && response.changes.length > 0) {
            message += '\n\nKey changes made:';
            response.changes.slice(0, 3).forEach((change, index) => {
                message += `\n${index + 1}. "${change.original}" → "${change.corrected}" (${change.reason})`;
            });
            
            if (response.changes.length > 3) {
                message += `\n... and ${response.changes.length - 3} more changes`;
            }
        }

        if (response.confidence !== undefined) {
            message += `\n\nConfidence: ${Math.round(response.confidence * 100)}%`;
        }

        const action = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            'OK',
            'Undo Changes'
        );

        if (action === 'Undo Changes') {
            await vscode.commands.executeCommand('undo');
        }
    }

    getPromptForCorrectionType(correctionType: CorrectionType): string {
        switch (correctionType) {
            case CorrectionType.GRAMMAR:
                return 'Please correct any grammatical errors in the following text while preserving the original meaning and style.';
            case CorrectionType.STYLE:
                return 'Please improve the writing style of the following text to make it more engaging and professional while maintaining the original tone.';
            case CorrectionType.CLARITY:
                return 'Please improve the clarity and readability of the following text by simplifying complex sentences and removing ambiguity.';
            case CorrectionType.TONE:
                return 'Please adjust the tone of the following text to be more appropriate and consistent throughout.';
            case CorrectionType.CUSTOM:
                return '';
            default:
                return 'Please improve the following text.';
        }
    }
}