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
class ConfigurationProvider {
    getConfiguration() {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        return {
            apiEndpoint: config.get('apiEndpoint', 'https://api.openai.com/v1/chat/completions'),
            apiKey: config.get('apiKey', ''),
            model: config.get('model', 'gpt-3.5-turbo'),
            maxTokens: config.get('maxTokens', 1000),
            temperature: config.get('temperature', 0.3),
            customPrompts: config.get('customPrompts', [])
        };
    }
    async updateConfiguration(key, value, target) {
        const config = vscode.workspace.getConfiguration(ConfigurationProvider.CONFIGURATION_SECTION);
        await config.update(key, value, target || vscode.ConfigurationTarget.Global);
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