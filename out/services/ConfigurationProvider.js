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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationProvider = void 0;
const vscode = __importStar(require("vscode"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const CorrectionType_1 = require("../models/CorrectionType");
class ConfigurationProvider {
    getConfiguration() {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        return {
            apiEndpoint: config.get('apiEndpoint', 'https://api.openai.com/v1/chat/completions'),
            apiKey: config.get('apiKey', ''),
            model: config.get('model', 'gpt-3.5-turbo'),
            maxTokens: config.get('maxTokens', 1000),
            temperature: config.get('temperature', 0.3),
            customPrompts: config.get('customPrompts', []),
            defaultPrompts: this.getDefaultPromptConfiguration()
        };
    }
    async updateConfiguration(key, value, target) {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        await config.update(key, value, target || vscode.ConfigurationTarget.Global);
    }
    getDefaultPromptConfiguration() {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        return {
            grammar: config.get('defaultPrompts.grammar') || this.getBuiltInDefaultPrompt(CorrectionType_1.CorrectionType.GRAMMAR),
            style: config.get('defaultPrompts.style') || this.getBuiltInDefaultPrompt(CorrectionType_1.CorrectionType.STYLE),
            clarity: config.get('defaultPrompts.clarity') || this.getBuiltInDefaultPrompt(CorrectionType_1.CorrectionType.CLARITY),
            tone: config.get('defaultPrompts.tone') || this.getBuiltInDefaultPrompt(CorrectionType_1.CorrectionType.TONE)
        };
    }
    getBuiltInDefaultPrompt(correctionType) {
        const builtInDefaults = {
            [CorrectionType_1.CorrectionType.GRAMMAR]: 'Please correct any grammatical errors in the following text. Focus on:\n' +
                '- Subject-verb agreement\n' +
                '- Verb tenses and consistency\n' +
                '- Punctuation and capitalization\n' +
                '- Sentence structure\n' +
                'Preserve the original meaning and style.',
            [CorrectionType_1.CorrectionType.STYLE]: 'Please improve the writing style of the following text. Focus on:\n' +
                '- Word choice and vocabulary\n' +
                '- Sentence variety and flow\n' +
                '- Clarity and conciseness\n' +
                '- Professional tone\n' +
                'Maintain the author\'s voice while enhancing readability.',
            [CorrectionType_1.CorrectionType.CLARITY]: 'Please improve the clarity and readability of the following text. Focus on:\n' +
                '- Simplifying complex sentences\n' +
                '- Removing ambiguity\n' +
                '- Improving logical flow\n' +
                '- Making concepts more understandable\n' +
                'Ensure the message is clear and accessible.',
            [CorrectionType_1.CorrectionType.TONE]: 'Please adjust the tone of the following text to be more appropriate. Focus on:\n' +
                '- Consistency in formality level\n' +
                '- Appropriate voice for the audience\n' +
                '- Professional yet engaging language\n' +
                '- Removing inappropriate or inconsistent tone\n' +
                'Maintain the core message while improving tone.'
        };
        return builtInDefaults[correctionType] || 'Please improve the following text.';
    }
    async updateDefaultPrompt(correctionType, prompt, target) {
        try {
            const validation = this.validatePrompt(prompt);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }
            const key = `defaultPrompts.${correctionType}`;
            await this.updateConfiguration(key, prompt, target);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update prompt'
            };
        }
    }
    async resetDefaultPrompt(correctionType, target) {
        try {
            const builtInDefault = this.getBuiltInDefaultPrompt(correctionType);
            const key = `defaultPrompts.${correctionType}`;
            await this.updateConfiguration(key, builtInDefault, target);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reset prompt'
            };
        }
    }
    validatePrompt(prompt) {
        const errors = [];
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
    validateConfiguration(config) {
        const errors = [];
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
        }
        catch {
            errors.push('API endpoint must be a valid URL');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    async testConnection(config) {
        try {
            const response = await (0, node_fetch_1.default)(config.apiEndpoint, {
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
            }
            else if (response.status === 401) {
                return { success: false, error: 'Invalid API key' };
            }
            else {
                return { success: false, error: `API returned status ${response.status}` };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
}
exports.ConfigurationProvider = ConfigurationProvider;
ConfigurationProvider.CONFIGURATION_SECTION = 'grammarProofreading';
//# sourceMappingURL=ConfigurationProvider.js.map