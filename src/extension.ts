import * as vscode from 'vscode';
import { PromptManager } from './services/PromptManager';
import { ConfigurationProvider } from './services/ConfigurationProvider';
import { LLMApiClient } from './services/LLMApiClient';
import { TaskManager } from './services/TaskManager';
import { CorrectionService } from './services/CorrectionService';
import { ErrorHandler } from './services/ErrorHandler';
import { ChatWidget } from './ui/ChatWidget';
import { VSCodeIntegration } from './ui/VSCodeIntegration';

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('Grammar Proofreading Extension is now active!');

    try {
        // Create output channel for logging
        const outputChannel = vscode.window.createOutputChannel('Grammar Proofreading');
        context.subscriptions.push(outputChannel);

        // Initialize error handler
        const errorHandler = new ErrorHandler(outputChannel);

        // Initialize configuration provider
        const configProvider = new ConfigurationProvider(context);

        // Initialize prompt manager
        const promptManager = new PromptManager();

        // Load existing configuration or create defaults
        try {
            const config = await configProvider.getPromptConfiguration();
            promptManager.loadConfiguration(config);
            
            // Ensure at least one prompt exists (fallback)
            if (promptManager.getPrompts().length === 0) {
                await configProvider.initializeDefaultConfiguration();
                const defaultConfig = await configProvider.getPromptConfiguration();
                promptManager.loadConfiguration(defaultConfig);
            }
        } catch (error) {
            errorHandler.handleSystemError(error instanceof Error ? error : new Error(String(error)), 'Configuration loading');
            // Create default prompts as fallback
            promptManager.ensureDefaultPrompts();
        }

        // Initialize API client
        const apiConfig = configProvider.getLLMApiConfiguration();
        const apiClient = new LLMApiClient(apiConfig);

        // Initialize task manager
        const taskManager = new TaskManager();

        // Initialize correction service
        const correctionService = new CorrectionService(promptManager, apiClient, taskManager, errorHandler);

        // Initialize chat widget
        const chatWidget = new ChatWidget(context.extensionUri, correctionService, promptManager);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ChatWidget.viewType, chatWidget)
        );

        // Initialize VSCode integration
        const vscodeIntegration = new VSCodeIntegration(correctionService, promptManager, chatWidget);
        context.subscriptions.push(vscodeIntegration);

        // Listen for configuration changes
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('grammarProofreading')) {
                try {
                    // Reload API configuration
                    const newApiConfig = configProvider.getLLMApiConfiguration();
                    apiClient.updateConfiguration(newApiConfig);

                    // Reload prompt configuration
                    const newPromptConfig = await configProvider.getPromptConfiguration();
                    promptManager.loadConfiguration(newPromptConfig);

                    // Update UI
                    vscodeIntegration.refreshPromptCommands();
                    chatWidget.refreshPromptButtons();

                    errorHandler.showSuccess('Configuration updated successfully');
                } catch (error) {
                    errorHandler.handleSystemError(
                        error instanceof Error ? error : new Error(String(error)), 
                        'Configuration update'
                    );
                }
            }
        });
        context.subscriptions.push(configChangeListener);

        // Register additional commands
        const commands = [
            vscode.commands.registerCommand('grammarProofreading.showOutput', () => {
                outputChannel.show();
            }),
            vscode.commands.registerCommand('grammarProofreading.clearOutput', () => {
                outputChannel.clear();
            }),
            vscode.commands.registerCommand('grammarProofreading.showStatistics', () => {
                const stats = correctionService.getStatistics();
                const errorStats = errorHandler.getErrorStatistics();
                
                const message = `Grammar Proofreading Statistics:
• Active tasks: ${stats.activeTasks}
• Total tasks started: ${stats.totalTasksStarted}
• Total tasks completed: ${stats.totalTasksCompleted}
• Total notifications: ${errorStats.totalNotifications}`;
                
                vscode.window.showInformationMessage(message, 'Show Output').then(selection => {
                    if (selection === 'Show Output') {
                        outputChannel.show();
                    }
                });
            }),
            vscode.commands.registerCommand('grammarProofreading.testApiConnection', async () => {
                try {
                    // Show current configuration (without exposing full API key)
                    const currentApiConfig = configProvider.getLLMApiConfiguration();
                    const configSummary = {
                        endpoint: currentApiConfig.endpoint,
                        apiKey: currentApiConfig.apiKey ? `${currentApiConfig.apiKey.substring(0, 10)}...` : 'MISSING',
                        model: currentApiConfig.model,
                        maxTokens: currentApiConfig.maxTokens,
                        temperature: currentApiConfig.temperature
                    };
                    
                    outputChannel.appendLine('[DEBUG] Current API Configuration:');
                    outputChannel.appendLine(JSON.stringify(configSummary, null, 2));
                    outputChannel.show();
                    
                    // Test configuration validation
                    const testApiClient = new LLMApiClient(currentApiConfig);
                    const validationErrors = testApiClient.validateConfiguration();
                    
                    if (validationErrors.length > 0) {
                        outputChannel.appendLine('[DEBUG] Configuration validation errors:');
                        validationErrors.forEach(error => outputChannel.appendLine(`  - ${error}`));
                        vscode.window.showErrorMessage(`API Configuration Invalid: ${validationErrors.join(', ')}`);
                        return;
                    }
                    
                    outputChannel.appendLine('[DEBUG] Configuration validation passed');
                    
                    // Test actual connection
                    outputChannel.appendLine('[DEBUG] Testing API connection...');
                    vscode.window.showInformationMessage('Testing API connection...');
                    
                    const testResult = await testApiClient.testConnection();
                    
                    if (testResult) {
                        outputChannel.appendLine('[DEBUG] API connection test successful!');
                        vscode.window.showInformationMessage('API connection test successful!');
                    } else {
                        outputChannel.appendLine('[DEBUG] API connection test failed - no response');
                        vscode.window.showErrorMessage('API connection test failed - no response received');
                    }
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    outputChannel.appendLine(`[DEBUG] API connection test failed: ${errorMessage}`);
                    outputChannel.show();
                    vscode.window.showErrorMessage(`API Connection Test Failed: ${errorMessage}`);
                }
            }),
            vscode.commands.registerCommand('grammarProofreading.changeChatWidgetPosition', async () => {
                const currentPosition = configProvider.getChatWidgetPosition();
                const positions = [
                    { label: 'Explorer Sidebar', value: 'explorer' as const, description: 'Show in the Explorer panel' },
                    { label: 'Source Control Sidebar', value: 'scm' as const, description: 'Show in the Source Control panel' },
                    { label: 'Debug Sidebar', value: 'debug' as const, description: 'Show in the Debug panel' },
                    { label: 'Extensions Sidebar', value: 'extensions' as const, description: 'Show in the Extensions panel' },
                    { label: 'Bottom Panel', value: 'panel' as const, description: 'Show in a dedicated bottom panel' }
                ];

                const selectedPosition = await vscode.window.showQuickPick(positions, {
                    placeHolder: `Current position: ${currentPosition}. Select new position for the chat widget`,
                    ignoreFocusOut: true
                });

                if (selectedPosition && selectedPosition.value !== currentPosition) {
                    await configProvider.setChatWidgetPosition(selectedPosition.value);
                    vscode.window.showInformationMessage(
                        `Chat widget position changed to ${selectedPosition.label}. The widget will appear in the new location.`,
                        'Show Widget'
                    ).then(selection => {
                        if (selection === 'Show Widget') {
                            vscode.commands.executeCommand('grammarProofreading.showChatWidget');
                        }
                    });
                }
            })
        ];
        context.subscriptions.push(...commands);

        // Log successful activation
        outputChannel.appendLine('[INFO] Grammar Proofreading Extension activated successfully');
        outputChannel.appendLine(`[INFO] Loaded ${promptManager.getPrompts().length} custom prompts`);
        
        errorHandler.showSuccess('Grammar Proofreading Extension activated successfully');

    } catch (error) {
        console.error('Failed to activate Grammar Proofreading Extension:', error);
        vscode.window.showErrorMessage(
            `Failed to activate Grammar Proofreading Extension: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Extension deactivation function
 */
export function deactivate() {
    console.log('Grammar Proofreading Extension is now deactivated');
    
    // Cleanup is handled automatically by VSCode disposing all items in context.subscriptions
    // Additional cleanup can be added here if needed
}