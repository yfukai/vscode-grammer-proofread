import { CustomPrompt, PromptConfiguration } from '../types';

/**
 * Manages CRUD operations for custom prompts with data integrity guarantees
 */
export class PromptManager {
    private prompts: Map<string, CustomPrompt> = new Map();
    private sharedPrompt: string = '';

    /**
     * Creates a new custom prompt
     * @param name Unique name for the prompt (1-100 characters)
     * @param content Prompt content (1-2000 characters)
     * @returns The created CustomPrompt
     * @throws Error if name is not unique or validation fails
     */
    createPrompt(name: string, content: string): CustomPrompt {
        // Validate name uniqueness
        if (this.getPromptByName(name)) {
            throw new Error(`Prompt with name "${name}" already exists`);
        }

        // Validate name length
        if (!name || name.trim().length === 0 || name.length > 100) {
            throw new Error('Prompt name must be 1-100 characters');
        }

        // Validate content length
        if (!content || content.trim().length === 0 || content.length > 2000) {
            throw new Error('Prompt content must be 1-2000 characters');
        }

        const now = new Date();
        const prompt: CustomPrompt = {
            id: this.generateId(),
            name: name.trim(),
            content: content.trim(),
            createdAt: now,
            updatedAt: now
        };

        this.prompts.set(prompt.id, prompt);
        return { ...prompt }; // Return a copy to maintain immutability
    }

    /**
     * Updates an existing custom prompt
     * @param id Prompt ID to update
     * @param name New name for the prompt
     * @param content New content for the prompt
     * @returns The updated CustomPrompt
     * @throws Error if prompt not found or validation fails
     */
    updatePrompt(id: string, name: string, content: string): CustomPrompt {
        const existingPrompt = this.prompts.get(id);
        if (!existingPrompt) {
            throw new Error(`Prompt with ID "${id}" not found`);
        }

        // Check name uniqueness (excluding current prompt)
        const existingWithName = this.getPromptByName(name);
        if (existingWithName && existingWithName.id !== id) {
            throw new Error(`Prompt with name "${name}" already exists`);
        }

        // Validate name length
        if (!name || name.trim().length === 0 || name.length > 100) {
            throw new Error('Prompt name must be 1-100 characters');
        }

        // Validate content length
        if (!content || content.trim().length === 0 || content.length > 2000) {
            throw new Error('Prompt content must be 1-2000 characters');
        }

        const updatedPrompt: CustomPrompt = {
            ...existingPrompt,
            name: name.trim(),
            content: content.trim(),
            updatedAt: new Date()
        };

        this.prompts.set(id, updatedPrompt);
        return { ...updatedPrompt }; // Return a copy to maintain immutability
    }

    /**
     * Deletes a custom prompt
     * @param id Prompt ID to delete
     * @throws Error if prompt not found or if trying to delete the last prompt
     */
    deletePrompt(id: string): void {
        if (!this.prompts.has(id)) {
            throw new Error(`Prompt with ID "${id}" not found`);
        }

        // Prevent deletion of the last prompt (minimum prompt invariant)
        if (this.prompts.size <= 1) {
            throw new Error('Cannot delete the last remaining prompt');
        }

        this.prompts.delete(id);
    }

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
     * Retrieves a prompt by name
     * @param name Prompt name to search for
     * @returns CustomPrompt or undefined if not found
     */
    private getPromptByName(name: string): CustomPrompt | undefined {
        return Array.from(this.prompts.values()).find(p => p.name === name);
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
     * Loads configuration from external source
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
     * Generates a unique ID for prompts
     * @returns Unique string ID
     */
    private generateId(): string {
        return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
     */
    ensureDefaultPrompts(): void {
        if (this.prompts.size === 0) {
            this.createPrompt('Grammar Correction', 'Please correct any grammar, spelling, and punctuation errors in the following text while preserving its original meaning and style.');
        }
    }
}