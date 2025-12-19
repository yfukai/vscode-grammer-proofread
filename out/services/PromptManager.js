"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptManager = void 0;
const ConfigurationProvider_1 = require("./ConfigurationProvider");
class PromptManager {
    constructor() {
        this.configProvider = new ConfigurationProvider_1.ConfigurationProvider();
    }
    getPromptByName(name) {
        const namePromptPair = this.getNamePromptPair(name);
        return namePromptPair?.prompt;
    }
    getPromptById(id) {
        const namePromptPair = this.getNamePromptPairById(id);
        return namePromptPair?.prompt;
    }
    getNamePromptPair(name) {
        return this.configProvider.getNamePromptPairByName(name);
    }
    getNamePromptPairById(id) {
        return this.configProvider.getNamePromptPairById(id);
    }
    async createNamePromptPair(namePromptPair) {
        return await this.configProvider.createNamePromptPair(namePromptPair);
    }
    async updateNamePromptPair(id, updates) {
        return await this.configProvider.updateNamePromptPair(id, updates);
    }
    async deleteNamePromptPair(id) {
        return await this.configProvider.deleteNamePromptPair(id);
    }
    getAllNamePromptPairs() {
        return this.configProvider.getNamePromptPairs();
    }
    getDefaultNamePromptPairs() {
        return this.configProvider.getDefaultNamePromptPairs();
    }
    validateNamePromptPair(prompt) {
        const errors = [];
        if (!prompt.name || prompt.name.trim() === '') {
            errors.push('Prompt name is required');
        }
        if (!prompt.prompt || prompt.prompt.trim() === '') {
            errors.push('Prompt content is required');
        }
        // Check if name contains only valid characters
        if (prompt.name && !/^[a-zA-Z0-9\s\-_]+$/.test(prompt.name)) {
            errors.push('Prompt name can only contain letters, numbers, spaces, hyphens, and underscores');
        }
        if (prompt.name && prompt.name.length > 50) {
            errors.push('Prompt name cannot exceed 50 characters');
        }
        if (prompt.prompt && prompt.prompt.length > 2000) {
            errors.push('Prompt content cannot exceed 2000 characters');
        }
        if (prompt.prompt && prompt.prompt.trim().length < 10) {
            errors.push('Prompt content must be at least 10 characters long');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.PromptManager = PromptManager;
//# sourceMappingURL=PromptManager.js.map