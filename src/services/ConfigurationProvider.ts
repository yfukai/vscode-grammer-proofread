import * as vscode from 'vscode';
import { PromptConfiguration, CustomPrompt, LLMApiConfiguration } from '../types';

/**
 * Provides configuration management for VSCode settings integration
 * Handles persistence of custom prompts, shared prompt, and API settings
 */
export class ConfigurationProvider {
    private static readonly EXTENSION_ID = 'grammarProofreading';
    private static readonly SHARED_PROMPT_KEY = 'sharedPrompt';
    private static readonly API_ENDPOINT_KEY = 'apiEndpoint';
    private static readonly API_KEY_KEY = 'apiKey';
    private static readonly MODEL_KEY = 'model';
    private static readonly CHAT_WIDGET_POSITION_KEY = 'chatWidgetPosition';
    private static readonly CUSTOM_PROMPTS_KEY = 'customPrompts';

    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Gets the current prompt configuration from settings
     * @returns PromptConfiguration object with custom prompts and shared prompt
     */
    async getPromptConfiguration(): Promise<PromptConfiguration> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        
        // Get custom prompts from VSCode settings
        const customPromptsFromSettings = config.get<Array<{name: string, content: string}>>(
            ConfigurationProvider.CUSTOM_PROMPTS_KEY, 
            []
        );

        // Convert settings format to CustomPrompt format with IDs and timestamps
        const customPrompts: CustomPrompt[] = customPromptsFromSettings.map((prompt, index) => ({
            id: `settings_prompt_${index}_${this.hashString(prompt.name + prompt.content)}`,
            name: prompt.name,
            content: prompt.content,
            createdAt: new Date(), // We don't have creation time from settings
            updatedAt: new Date()
        }));

        // Get shared prompt from VSCode settings
        const sharedPrompt = config.get<string>(ConfigurationProvider.SHARED_PROMPT_KEY, '');

        return {
            customPrompts,
            sharedPrompt
        };
    }

    /**
     * Simple hash function to generate consistent IDs from prompt content
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Saves the prompt configuration to settings
     * Note: Custom prompts are now managed through VSCode settings directly
     * @param configuration PromptConfiguration to save
     */
    async savePromptConfiguration(configuration: PromptConfiguration): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        
        // Only save shared prompt to VSCode settings
        // Custom prompts are managed directly through settings UI
        await config.update(
            ConfigurationProvider.SHARED_PROMPT_KEY, 
            configuration.sharedPrompt, 
            vscode.ConfigurationTarget.Workspace
        );
    }

    /**
     * Gets the current LLM API configuration
     * @returns LLMApiConfiguration object
     */
    getLLMApiConfiguration(): LLMApiConfiguration {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        
        return {
            endpoint: config.get<string>(ConfigurationProvider.API_ENDPOINT_KEY, 'https://api.openai.com/v1/chat/completions'),
            apiKey: config.get<string>(ConfigurationProvider.API_KEY_KEY, ''),
            model: config.get<string>(ConfigurationProvider.MODEL_KEY, 'gpt-3.5-turbo'),
            maxTokens: 1000, // Default value, could be made configurable
            temperature: 0.7 // Default value, could be made configurable
        };
    }

    /**
     * Saves LLM API configuration to settings
     * @param apiConfig LLMApiConfiguration to save
     */
    async saveLLMApiConfiguration(apiConfig: Partial<LLMApiConfiguration>): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        
        if (apiConfig.endpoint !== undefined) {
            await config.update(
                ConfigurationProvider.API_ENDPOINT_KEY, 
                apiConfig.endpoint, 
                vscode.ConfigurationTarget.Workspace
            );
        }

        if (apiConfig.apiKey !== undefined) {
            await config.update(
                ConfigurationProvider.API_KEY_KEY, 
                apiConfig.apiKey, 
                vscode.ConfigurationTarget.Workspace
            );
        }

        if (apiConfig.model !== undefined) {
            await config.update(
                ConfigurationProvider.MODEL_KEY, 
                apiConfig.model, 
                vscode.ConfigurationTarget.Workspace
            );
        }
    }

    /**
     * Gets the shared prompt from settings
     * @returns Current shared prompt content
     */
    getSharedPrompt(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        return config.get<string>(ConfigurationProvider.SHARED_PROMPT_KEY, '');
    }

    /**
     * Sets the shared prompt in settings
     * @param sharedPrompt New shared prompt content
     */
    async setSharedPrompt(sharedPrompt: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        await config.update(
            ConfigurationProvider.SHARED_PROMPT_KEY, 
            sharedPrompt, 
            vscode.ConfigurationTarget.Workspace
        );
    }

    /**
     * Validates API configuration
     * @param apiConfig Configuration to validate
     * @returns Array of validation errors (empty if valid)
     */
    validateApiConfiguration(apiConfig: LLMApiConfiguration): string[] {
        const errors: string[] = [];

        // Validate endpoint URL
        if (!apiConfig.endpoint || apiConfig.endpoint.trim().length === 0) {
            errors.push('API endpoint is required');
        } else {
            try {
                new URL(apiConfig.endpoint);
            } catch {
                errors.push('API endpoint must be a valid URL');
            }
        }

        // Validate API key
        if (!apiConfig.apiKey || apiConfig.apiKey.trim().length === 0) {
            errors.push('API key is required');
        }

        // Validate model
        if (!apiConfig.model || apiConfig.model.trim().length === 0) {
            errors.push('Model is required');
        }

        // Validate numeric values
        if (apiConfig.maxTokens <= 0) {
            errors.push('Max tokens must be greater than 0');
        }

        if (apiConfig.temperature < 0 || apiConfig.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }

        return errors;
    }

    /**
     * Checks if this is the first installation (no custom prompts configured)
     * @returns true if this appears to be first installation
     */
    async isFirstInstallation(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        const customPrompts = config.get<Array<{name: string, content: string}>>(
            ConfigurationProvider.CUSTOM_PROMPTS_KEY, 
            []
        );
        return customPrompts.length === 0;
    }

    /**
     * Creates default prompts for first installation
     * @returns Array of default prompt objects in settings format
     */
    createDefaultPrompts(): Array<{name: string, content: string}> {
        return [
            {
                name: 'Grammar Correction',
                content: 'Please correct any grammar, spelling, and punctuation errors in the following text while preserving its original meaning and style.'
            },
            {
                name: 'Logic Reorganization',
                content: 'Please reorganize the following text to improve its logical flow and clarity while maintaining all the original information.'
            },
            {
                name: 'Tense Consistency',
                content: 'Please review and correct the tense consistency in the following text, ensuring all verbs are in the appropriate tense throughout.'
            }
        ];
    }

    /**
     * Initializes default configuration on first installation
     * Note: Default prompts are now set in package.json, so this mainly ensures settings exist
     */
    async initializeDefaultConfiguration(): Promise<void> {
        if (await this.isFirstInstallation()) {
            const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
            const defaultPrompts = this.createDefaultPrompts();
            
            // Set default prompts in settings if none exist
            await config.update(
                ConfigurationProvider.CUSTOM_PROMPTS_KEY,
                defaultPrompts,
                vscode.ConfigurationTarget.Workspace
            );
        }
    }

    /**
     * Gets the chat widget position preference
     * @returns Position where the chat widget should be displayed
     */
    getChatWidgetPosition(): 'explorer' | 'scm' | 'debug' | 'extensions' | 'panel' {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        return config.get<'explorer' | 'scm' | 'debug' | 'extensions' | 'panel'>(
            ConfigurationProvider.CHAT_WIDGET_POSITION_KEY, 
            'explorer'
        );
    }

    /**
     * Sets the chat widget position preference
     * @param position Where to display the chat widget
     */
    async setChatWidgetPosition(position: 'explorer' | 'scm' | 'debug' | 'extensions' | 'panel'): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.EXTENSION_ID);
        await config.update(
            ConfigurationProvider.CHAT_WIDGET_POSITION_KEY, 
            position, 
            vscode.ConfigurationTarget.Workspace
        );
    }

    /**
     * Registers configuration change listeners
     * @param onConfigurationChange Callback for when configuration changes
     */
    onConfigurationChange(onConfigurationChange: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(ConfigurationProvider.EXTENSION_ID)) {
                onConfigurationChange();
            }
        });
    }
}