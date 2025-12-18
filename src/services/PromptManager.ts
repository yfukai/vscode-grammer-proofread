import { CorrectionType } from '../models/CorrectionType';
import { CustomPrompt } from '../models/ExtensionConfiguration';
import { ConfigurationProvider } from './ConfigurationProvider';

export class PromptManager {
    private configProvider: ConfigurationProvider;
    private defaultPrompts: Map<CorrectionType, string> = new Map();

    constructor() {
        this.configProvider = new ConfigurationProvider();
        this.initializeDefaultPrompts();
    }

    private initializeDefaultPrompts(): void {
        this.defaultPrompts = new Map([
            [CorrectionType.GRAMMAR, 
                'Please correct any grammatical errors in the following text. Focus on:\n' +
                '- Subject-verb agreement\n' +
                '- Verb tenses and consistency\n' +
                '- Punctuation and capitalization\n' +
                '- Sentence structure\n' +
                'Preserve the original meaning and style.'
            ],
            [CorrectionType.STYLE, 
                'Please improve the writing style of the following text. Focus on:\n' +
                '- Word choice and vocabulary\n' +
                '- Sentence variety and flow\n' +
                '- Clarity and conciseness\n' +
                '- Professional tone\n' +
                'Maintain the author\'s voice while enhancing readability.'
            ],
            [CorrectionType.CLARITY, 
                'Please improve the clarity and readability of the following text. Focus on:\n' +
                '- Simplifying complex sentences\n' +
                '- Removing ambiguity\n' +
                '- Improving logical flow\n' +
                '- Making concepts more understandable\n' +
                'Ensure the message is clear and accessible.'
            ],
            [CorrectionType.TONE, 
                'Please adjust the tone of the following text to be more appropriate. Focus on:\n' +
                '- Consistency in formality level\n' +
                '- Appropriate voice for the audience\n' +
                '- Professional yet engaging language\n' +
                '- Removing inappropriate or inconsistent tone\n' +
                'Maintain the core message while improving tone.'
            ]
        ]);
    }

    getPrompt(correctionType: CorrectionType, customPromptName?: string): string {
        // If a custom prompt name is provided, try to find it
        if (customPromptName) {
            const customPrompt = this.getCustomPrompt(customPromptName);
            if (customPrompt) {
                return customPrompt.prompt;
            }
        }

        // Return default prompt for the correction type
        return this.defaultPrompts.get(correctionType) || 'Please improve the following text.';
    }

    getCustomPrompt(name: string): CustomPrompt | undefined {
        const config = this.configProvider.getConfiguration();
        return config.customPrompts.find(prompt => prompt.name === name);
    }

    async addCustomPrompt(prompt: CustomPrompt): Promise<{ success: boolean; error?: string }> {
        try {
            const config = this.configProvider.getConfiguration();
            
            // Check if prompt with same name already exists
            const existingIndex = config.customPrompts.findIndex(p => p.name === prompt.name);
            
            if (existingIndex >= 0) {
                // Update existing prompt
                config.customPrompts[existingIndex] = prompt;
            } else {
                // Add new prompt
                config.customPrompts.push(prompt);
            }

            await this.configProvider.updateConfiguration('customPrompts', config.customPrompts);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to save custom prompt' 
            };
        }
    }

    async removeCustomPrompt(name: string): Promise<{ success: boolean; error?: string }> {
        try {
            const config = this.configProvider.getConfiguration();
            const filteredPrompts = config.customPrompts.filter(prompt => prompt.name !== name);
            
            if (filteredPrompts.length === config.customPrompts.length) {
                return { success: false, error: 'Custom prompt not found' };
            }

            await this.configProvider.updateConfiguration('customPrompts', filteredPrompts);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to remove custom prompt' 
            };
        }
    }

    getAllCustomPrompts(): CustomPrompt[] {
        const config = this.configProvider.getConfiguration();
        return config.customPrompts;
    }

    getDefaultPrompts(): Array<{ type: CorrectionType; prompt: string }> {
        return Array.from(this.defaultPrompts.entries()).map(([type, prompt]) => ({
            type,
            prompt
        }));
    }

    validatePrompt(prompt: CustomPrompt): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!prompt.name || prompt.name.trim() === '') {
            errors.push('Prompt name is required');
        }

        if (!prompt.prompt || prompt.prompt.trim() === '') {
            errors.push('Prompt content is required');
        }

        if (!prompt.correctionType || prompt.correctionType.trim() === '') {
            errors.push('Correction type is required');
        }

        // Check if name contains only valid characters
        if (prompt.name && !/^[a-zA-Z0-9\s\-_]+$/.test(prompt.name)) {
            errors.push('Prompt name can only contain letters, numbers, spaces, hyphens, and underscores');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}