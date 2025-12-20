import * as vscode from 'vscode';
import { ConfigurationProvider } from './ConfigurationProvider';
import { PromptManager } from './PromptManager';
import { PromptConfiguration, CustomPrompt } from '../types';

/**
 * Manages storage operations and synchronization between PromptManager and VSCode settings
 * Provides persistence layer for the extension's data
 */
export class StorageService {
    private readonly configProvider: ConfigurationProvider;
    private readonly promptManager: PromptManager;
    private configChangeListener?: vscode.Disposable;

    constructor(context: vscode.ExtensionContext) {
        this.configProvider = new ConfigurationProvider(context);
        this.promptManager = new PromptManager();
    }

    /**
     * Initializes the storage service and loads existing configuration
     * Sets up default prompts on first installation
     */
    async initialize(): Promise<void> {
        // Initialize default configuration if this is first installation
        await this.configProvider.initializeDefaultConfiguration();
        
        // Load existing configuration into PromptManager
        await this.loadConfiguration();
        
        // Ensure at least one prompt exists (safety check)
        this.promptManager.ensureDefaultPrompts();
        
        // Save any changes made by ensureDefaultPrompts
        await this.saveConfiguration();
        
        // Set up configuration change listener
        this.setupConfigurationListener();
    }

    /**
     * Loads configuration from storage into PromptManager
     */
    async loadConfiguration(): Promise<void> {
        const config = await this.configProvider.getPromptConfiguration();
        this.promptManager.loadConfiguration(config);
    }

    /**
     * Saves current PromptManager state to storage
     */
    async saveConfiguration(): Promise<void> {
        const config = this.promptManager.getConfiguration();
        await this.configProvider.savePromptConfiguration(config);
    }

    /**
     * Gets the PromptManager instance
     * @returns PromptManager instance
     */
    getPromptManager(): PromptManager {
        return this.promptManager;
    }

    /**
     * Gets the ConfigurationProvider instance
     * @returns ConfigurationProvider instance
     */
    getConfigurationProvider(): ConfigurationProvider {
        return this.configProvider;
    }

    /**
     * Creates a new custom prompt and persists it
     * @param name Prompt name
     * @param content Prompt content
     * @returns Created CustomPrompt
     */
    async createPrompt(name: string, content: string): Promise<CustomPrompt> {
        const prompt = this.promptManager.createPrompt(name, content);
        await this.saveConfiguration();
        return prompt;
    }

    /**
     * Updates an existing custom prompt and persists changes
     * @param id Prompt ID
     * @param name New prompt name
     * @param content New prompt content
     * @returns Updated CustomPrompt
     */
    async updatePrompt(id: string, name: string, content: string): Promise<CustomPrompt> {
        const prompt = this.promptManager.updatePrompt(id, name, content);
        await this.saveConfiguration();
        return prompt;
    }

    /**
     * Deletes a custom prompt and persists changes
     * @param id Prompt ID to delete
     */
    async deletePrompt(id: string): Promise<void> {
        this.promptManager.deletePrompt(id);
        await this.saveConfiguration();
    }

    /**
     * Gets all custom prompts
     * @returns Array of CustomPrompt objects
     */
    getPrompts(): CustomPrompt[] {
        return this.promptManager.getPrompts();
    }

    /**
     * Gets a specific prompt by ID
     * @param id Prompt ID
     * @returns CustomPrompt or undefined if not found
     */
    getPrompt(id: string): CustomPrompt | undefined {
        return this.promptManager.getPrompt(id);
    }

    /**
     * Gets the current shared prompt
     * @returns Shared prompt content
     */
    getSharedPrompt(): string {
        return this.promptManager.getSharedPrompt();
    }

    /**
     * Sets the shared prompt and persists it
     * @param content New shared prompt content
     */
    async setSharedPrompt(content: string): Promise<void> {
        this.promptManager.setSharedPrompt(content);
        await this.configProvider.setSharedPrompt(content);
    }

    /**
     * Validates shared prompt content
     * @param content Content to validate
     * @returns true if valid
     */
    validateSharedPrompt(content: string): boolean {
        return this.promptManager.validateSharedPrompt(content);
    }

    /**
     * Combines a custom prompt with the shared prompt
     * @param customPromptId ID of custom prompt
     * @returns Combined prompt text
     */
    combinePrompts(customPromptId: string): string {
        return this.promptManager.combinePrompts(customPromptId);
    }

    /**
     * Gets the current prompt configuration
     * @returns PromptConfiguration object
     */
    getConfiguration(): PromptConfiguration {
        return this.promptManager.getConfiguration();
    }

    /**
     * Synchronizes configuration from external changes (e.g., settings UI)
     * This method should be called when VSCode settings change
     */
    async synchronizeFromSettings(): Promise<void> {
        // Get the latest shared prompt from settings
        const sharedPrompt = this.configProvider.getSharedPrompt();
        
        // Update PromptManager with the new shared prompt
        this.promptManager.setSharedPrompt(sharedPrompt);
        
        // Note: Custom prompts are stored in workspace state, not settings,
        // so they don't need synchronization from settings changes
    }

    /**
     * Sets up listener for configuration changes
     */
    private setupConfigurationListener(): void {
        this.configChangeListener = this.configProvider.onConfigurationChange(async () => {
            await this.synchronizeFromSettings();
        });
    }

    /**
     * Disposes of resources and listeners
     */
    dispose(): void {
        if (this.configChangeListener) {
            this.configChangeListener.dispose();
        }
    }

    /**
     * Resets to default configuration (useful for testing or troubleshooting)
     */
    async resetToDefaults(): Promise<void> {
        // Clear current prompts
        const currentPrompts = this.promptManager.getPrompts();
        for (const prompt of currentPrompts.slice(0, -1)) { // Keep one to avoid minimum prompt violation
            this.promptManager.deletePrompt(prompt.id);
        }
        
        // Clear the last prompt and recreate defaults
        const lastPrompt = this.promptManager.getPrompts()[0];
        if (lastPrompt) {
            // Temporarily create a new prompt so we can delete the last one
            const tempPrompt = this.promptManager.createPrompt('temp', 'temp');
            this.promptManager.deletePrompt(lastPrompt.id);
            this.promptManager.deletePrompt(tempPrompt.id);
        }
        
        // Recreate defaults
        this.promptManager.ensureDefaultPrompts();
        
        // Clear shared prompt
        this.promptManager.setSharedPrompt('');
        
        // Save the reset configuration
        await this.saveConfiguration();
        await this.configProvider.setSharedPrompt('');
    }
}