import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ExtensionConfiguration } from '../models/ExtensionConfiguration';

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
            customPrompts: config.get('customPrompts', [])
        };
    }

    async updateConfiguration(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        await config.update(key, value, target || vscode.ConfigurationTarget.Global);
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