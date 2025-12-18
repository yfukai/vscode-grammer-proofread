import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ExtensionConfiguration, DefaultPromptConfiguration } from '../models/ExtensionConfiguration';
import { CorrectionType } from '../models/CorrectionType';

export class ConfigurationProvider {
    private static readonly CONFIGURATION_SECTION = 'grammarProofreading';

    getConfiguration(): ExtensionConfiguration {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        
        return {
            apiEndpoint: config.get<string>('apiEndpoint', 'https://api.openai.com/v1/chat/completions'),
            apiKey: config.get<string>('apiKey', ''),
            model: config.get<string>('model', 'gpt-3.5-turbo'),
            maxTokens: config.get<number>('maxTokens', 1000),
            temperature: config.get<number>('temperature', 0.3),
            customPrompts: config.get('customPrompts', []),
            defaultPrompts: this.getDefaultPromptConfiguration()
        };
    }

    async updateConfiguration(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        await config.update(key, value, target || vscode.ConfigurationTarget.Global);
    }

    getDefaultPromptConfiguration(): DefaultPromptConfiguration {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        
        return {
            grammar: config.get<string>('defaultPrompts.grammar') || this.getBuiltInDefaultPrompt(CorrectionType.GRAMMAR),
            style: config.get<string>('defaultPrompts.style') || this.getBuiltInDefaultPrompt(CorrectionType.STYLE),
            clarity: config.get<string>('defaultPrompts.clarity') || this.getBuiltInDefaultPrompt(CorrectionType.CLARITY),
            tone: config.get<string>('defaultPrompts.tone') || this.getBuiltInDefaultPrompt(CorrectionType.TONE)
        };
    }

    private getBuiltInDefaultPrompt(correctionType: CorrectionType): string {
        const builtInDefaults: Record<string, string> = {
            [CorrectionType.GRAMMAR]: 
                'Please correct any grammatical errors in the following text. Focus on:\n' +
                '- Subject-verb agreement\n' +
                '- Verb tenses and consistency\n' +
                '- Punctuation and capitalization\n' +
                '- Sentence structure\n' +
                'Preserve the original meaning and style.',
            [CorrectionType.STYLE]: 
                'Please improve the writing style of the following text. Focus on:\n' +
                '- Word choice and vocabulary\n' +
                '- Sentence variety and flow\n' +
                '- Clarity and conciseness\n' +
                '- Professional tone\n' +
                'Maintain the author\'s voice while enhancing readability.',
            [CorrectionType.CLARITY]: 
                'Please improve the clarity and readability of the following text. Focus on:\n' +
                '- Simplifying complex sentences\n' +
                '- Removing ambiguity\n' +
                '- Improving logical flow\n' +
                '- Making concepts more understandable\n' +
                'Ensure the message is clear and accessible.',
            [CorrectionType.TONE]: 
                'Please adjust the tone of the following text to be more appropriate. Focus on:\n' +
                '- Consistency in formality level\n' +
                '- Appropriate voice for the audience\n' +
                '- Professional yet engaging language\n' +
                '- Removing inappropriate or inconsistent tone\n' +
                'Maintain the core message while improving tone.'
        };

        return builtInDefaults[correctionType] || 'Please improve the following text.';
    }

    async updateDefaultPrompt(correctionType: CorrectionType, prompt: string, target?: vscode.ConfigurationTarget): Promise<{ success: boolean; error?: string }> {
        try {
            const validation = this.validatePrompt(prompt);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }

            const key = `defaultPrompts.${correctionType}`;
            await this.updateConfiguration(key, prompt, target);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to update prompt' 
            };
        }
    }

    async resetDefaultPrompt(correctionType: CorrectionType, target?: vscode.ConfigurationTarget): Promise<{ success: boolean; error?: string }> {
        try {
            const builtInDefault = this.getBuiltInDefaultPrompt(correctionType);
            const key = `defaultPrompts.${correctionType}`;
            await this.updateConfiguration(key, builtInDefault, target);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to reset prompt' 
            };
        }
    }

    validatePrompt(prompt: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!prompt || prompt.trim() === '') {
            errors.push('Prompt content cannot be empty');
            return { isValid: false, errors };
        }

        if (prompt.trim().length < 10) {
            errors.push('Prompt content must be at least 10 characters long');
        }

        if (prompt.length > 2000) {
            errors.push('Prompt content cannot exceed 2000 characters');
        }

        // Check for potentially problematic content (only whitespace)
        if (/^\s*$/.test(prompt)) {
            errors.push('Prompt cannot contain only whitespace');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateConfiguration(config: ExtensionConfiguration): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
            errors.push('API endpoint is required');
        }

        if (!config.apiKey || config.apiKey.trim() === '') {
            errors.push('API key is required');
        }

        if (!config.model || config.model.trim() === '') {
            errors.push('Model is required');
        }

        if (config.maxTokens <= 0) {
            errors.push('Max tokens must be greater than 0');
        }

        if (config.temperature < 0 || config.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }

        try {
            new URL(config.apiEndpoint);
        } catch {
            errors.push('API endpoint must be a valid URL');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async testConnection(config: ExtensionConfiguration): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                })
            });

            if (response.ok || response.status === 400) {
                // 400 is acceptable as it means the API is reachable but our test request was minimal
                return { success: true };
            } else if (response.status === 401) {
                return { success: false, error: 'Invalid API key' };
            } else {
                return { success: false, error: `API returned status ${response.status}` };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Network error' 
            };
        }
    }
}