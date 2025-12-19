import { NamePromptPair } from '../models/NamePromptPair';
import { ConfigurationProvider } from './ConfigurationProvider';

export class PromptManager {
    private configProvider: ConfigurationProvider;

    constructor() {
        this.configProvider = new ConfigurationProvider();
    }

    getPromptByName(name: string): string | undefined {
        const namePromptPair = this.getNamePromptPair(name);
        return namePromptPair?.prompt;
    }

    getPromptById(id: string): string | undefined {
        const namePromptPair = this.getNamePromptPairById(id);
        return namePromptPair?.prompt;
    }

    getNamePromptPair(name: string): NamePromptPair | undefined {
        return this.configProvider.getNamePromptPairByName(name);
    }

    getNamePromptPairById(id: string): NamePromptPair | undefined {
        return this.configProvider.getNamePromptPairById(id);
    }

    async createNamePromptPair(namePromptPair: Omit<NamePromptPair, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string; id?: string }> {
        return await this.configProvider.createNamePromptPair(namePromptPair);
    }

    async updateNamePromptPair(id: string, updates: Partial<Omit<NamePromptPair, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean; error?: string }> {
        return await this.configProvider.updateNamePromptPair(id, updates);
    }

    async deleteNamePromptPair(id: string): Promise<{ success: boolean; error?: string }> {
        return await this.configProvider.deleteNamePromptPair(id);
    }

    getAllNamePromptPairs(): NamePromptPair[] {
        return this.configProvider.getNamePromptPairs();
    }

    getDefaultNamePromptPairs(): NamePromptPair[] {
        return this.configProvider.getDefaultNamePromptPairs();
    }

    validateNamePromptPair(prompt: Partial<NamePromptPair>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

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