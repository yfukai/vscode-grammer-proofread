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
exports.CorrectionService = void 0;
const vscode = __importStar(require("vscode"));
const CorrectionType_1 = require("../models/CorrectionType");
const ConfigurationProvider_1 = require("./ConfigurationProvider");
const TextProcessor_1 = require("./TextProcessor");
const LLMApiClient_1 = require("./LLMApiClient");
class CorrectionService {
    constructor() {
        this.configProvider = new ConfigurationProvider_1.ConfigurationProvider();
        this.textProcessor = new TextProcessor_1.TextProcessor();
        this.apiClient = new LLMApiClient_1.LLMApiClient();
    }
    async performCorrection(correctionType, customPrompt) {
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
                const correctionRequest = {
                    text: textCapture.text,
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
                const replaceResult = await this.textProcessor.replaceEditorText(apiResult.data.correctedText);
                if (!replaceResult.success) {
                    return { success: false, error: replaceResult.error };
                }
                progress.report({ increment: 25, message: 'Showing explanation...' });
                // Show explanation
                await this.showCorrectionExplanation(apiResult.data);
                return { success: true };
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async showCorrectionExplanation(response) {
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
        const action = await vscode.window.showInformationMessage(message, { modal: false }, 'OK', 'Undo Changes');
        if (action === 'Undo Changes') {
            await vscode.commands.executeCommand('undo');
        }
    }
    getPromptForCorrectionType(correctionType) {
        switch (correctionType) {
            case CorrectionType_1.CorrectionType.GRAMMAR:
                return 'Please correct any grammatical errors in the following text while preserving the original meaning and style.';
            case CorrectionType_1.CorrectionType.STYLE:
                return 'Please improve the writing style of the following text to make it more engaging and professional while maintaining the original tone.';
            case CorrectionType_1.CorrectionType.CLARITY:
                return 'Please improve the clarity and readability of the following text by simplifying complex sentences and removing ambiguity.';
            case CorrectionType_1.CorrectionType.TONE:
                return 'Please adjust the tone of the following text to be more appropriate and consistent throughout.';
            case CorrectionType_1.CorrectionType.CUSTOM:
                return '';
            default:
                return 'Please improve the following text.';
        }
    }
}
exports.CorrectionService = CorrectionService;
//# sourceMappingURL=CorrectionService.js.map