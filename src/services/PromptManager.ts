import { CustomPrompt, PromptConfiguration } from '../types';

/**
 * Manages custom prompts loaded from configuration
 * Prompts are now managed through VSCode settings
 */
export class PromptManager {
    private prompts: Map<string, CustomPrompt> = new Map();
    private sharedPrompt: string = '';

    /**
     * Retrieves all custom prompts
     * @returns Array of all CustomPrompt objects
     */
    getPrompts(): CustomPrompt[] {
        return Array.from(this.prompts.values()).map(prompt => ({ ...prompt }));
    }

    /**
     * Retrieves a specific prompt by ID
     * @param id Prompt ID to retrieve
     * @returns CustomPrompt or undefined if not found
     */
    getPrompt(id: string): CustomPrompt | undefined {
        const prompt = this.prompts.get(id);
        return prompt ? { ...prompt } : undefined;
    }

    /**
     * Gets the shared prompt
     * @returns Current shared prompt content
     */
    getSharedPrompt(): string {
        return this.sharedPrompt;
    }

    /**
     * Sets the shared prompt
     * @param content New shared prompt content (0-2000 characters)
     * @throws Error if content exceeds length limit
     */
    setSharedPrompt(content: string): void {
        if (content.length > 2000) {
            throw new Error('Shared prompt content must not exceed 2000 characters');
        }
        this.sharedPrompt = content;
    }

    /**
     * Validates shared prompt content
     * @param content Content to validate
     * @returns true if valid, false otherwise
     */
    validateSharedPrompt(content: string): boolean {
        return content.length <= 2000;
    }

    /**
     * Gets the current configuration
     * @returns PromptConfiguration object
     */
    getConfiguration(): PromptConfiguration {
        return {
            customPrompts: this.getPrompts(),
            sharedPrompt: this.sharedPrompt
        };
    }

    /**
     * Loads configuration from external source (settings)
     * @param config Configuration to load
     */
    loadConfiguration(config: PromptConfiguration): void {
        this.prompts.clear();
        this.sharedPrompt = config.sharedPrompt;
        
        for (const prompt of config.customPrompts) {
            this.prompts.set(prompt.id, { ...prompt });
        }
    }

    /**
     * Combines a custom prompt with the shared prompt
     * @param customPromptId ID of the custom prompt to combine
     * @returns Combined prompt text (custom prompt + shared prompt)
     * @throws Error if custom prompt not found
     */
    combinePrompts(customPromptId: string): string {
        const customPrompt = this.prompts.get(customPromptId);
        if (!customPrompt) {
            throw new Error(`Custom prompt with ID "${customPromptId}" not found`);
        }

        // Combine custom prompt content with shared prompt
        // Custom prompt comes first, then shared prompt is appended
        if (this.sharedPrompt.trim().length === 0) {
            return customPrompt.content;
        }
        
        return `${customPrompt.content}\n\n${this.sharedPrompt}`;
    }

    /**
     * Ensures at least one default prompt exists
     * Note: With settings-based configuration, this is mainly for fallback
     */
    ensureDefaultPrompts(): void {
        if (this.prompts.size === 0) {
            // Create a fallback prompt if none exist
            const now = new Date();
            const fallbackPrompt: CustomPrompt = {
                id: 'fallback_grammar',
                name: 'Grammar Correction',
                content: 'Please correct any grammar, spelling, and punctuation errors in the following text while preserving its original meaning and style.',
                createdAt: now,
                updatedAt: now
            };
            this.prompts.set(fallbackPrompt.id, fallbackPrompt);
        }
    }
}