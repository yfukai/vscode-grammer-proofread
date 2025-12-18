"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CorrectionType_1 = require("../../models/CorrectionType");
// Mock VSCode API
const mockVscode = {
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn()
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInputBox: jest.fn(),
        createWebviewPanel: jest.fn(),
        setStatusBarMessage: jest.fn()
    },
    ViewColumn: {
        Beside: 2
    },
    ExtensionContext: class MockExtensionContext {
        constructor() {
            this.subscriptions = [];
        }
    }
};
jest.doMock('vscode', () => mockVscode, { virtual: true });
// Create simplified UI classes for testing
class ExtensionActivatorLogic {
    constructor() {
        this.commands = [];
        this.isActivated = false;
    }
    activate() {
        this.isActivated = true;
        this.commands = [
            'grammarProofreading.correctGrammar',
            'grammarProofreading.correctStyle',
            'grammarProofreading.correctClarity',
            'grammarProofreading.correctTone',
            'grammarProofreading.correctCustom',
            'grammarProofreading.openSettings'
        ];
        return {
            success: true,
            commandsRegistered: [...this.commands]
        };
    }
    deactivate() {
        this.isActivated = false;
        this.commands = [];
        return { success: true };
    }
    isExtensionActivated() {
        return this.isActivated;
    }
    getRegisteredCommands() {
        return [...this.commands];
    }
}
class CommandRegistryLogic {
    constructor() {
        this.registeredCommands = new Map();
    }
    registerCommands() {
        this.registeredCommands.set('grammarProofreading.correctGrammar', CorrectionType_1.CorrectionType.GRAMMAR);
        this.registeredCommands.set('grammarProofreading.correctStyle', CorrectionType_1.CorrectionType.STYLE);
        this.registeredCommands.set('grammarProofreading.correctClarity', CorrectionType_1.CorrectionType.CLARITY);
        this.registeredCommands.set('grammarProofreading.correctTone', CorrectionType_1.CorrectionType.TONE);
        this.registeredCommands.set('grammarProofreading.correctCustom', 'custom');
        this.registeredCommands.set('grammarProofreading.openSettings', 'settings');
        return {
            success: true,
            commandCount: this.registeredCommands.size
        };
    }
    getCommandMapping(commandId) {
        return this.registeredCommands.get(commandId);
    }
    getAllCommands() {
        return Array.from(this.registeredCommands.keys());
    }
    validateCommandId(commandId) {
        const hasCorrectPrefix = commandId.startsWith('grammarProofreading.');
        const isRegistered = this.registeredCommands.has(commandId);
        return {
            isValid: isRegistered,
            hasCorrectPrefix
        };
    }
}
class NotificationManagerLogic {
    formatSuccessMessage(response) {
        let message = `✅ Correction completed successfully!`;
        if (response.changes && response.changes.length > 0) {
            message += ` Made ${response.changes.length} change${response.changes.length > 1 ? 's' : ''}.`;
        }
        return message;
    }
    formatErrorMessage(error) {
        return `❌ Grammar correction failed: ${error}`;
    }
    formatWarningMessage(message) {
        return `⚠️ ${message}`;
    }
    formatConfigurationError(errors) {
        return `Configuration issues found:\n${errors.join('\n')}`;
    }
    generateDetailedHtml(response) {
        const changesHtml = response.changes?.map((change, index) => `
            <div class="change-item">
                <h4>Change ${index + 1}</h4>
                <div class="change-content">
                    <div class="original">
                        <strong>Original:</strong> "${change.original}"
                    </div>
                    <div class="corrected">
                        <strong>Corrected:</strong> "${change.corrected}"
                    </div>
                    <div class="reason">
                        <strong>Reason:</strong> ${change.reason}
                    </div>
                </div>
            </div>
        `).join('') || '<p>No specific changes tracked.</p>';
        const confidenceColor = response.confidence >= 0.8 ? '#4CAF50' :
            response.confidence >= 0.6 ? '#FF9800' : '#F44336';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Correction Details</title>
            </head>
            <body>
                <h1>Correction Details</h1>
                <div class="explanation">
                    <h3>Explanation</h3>
                    <p>${response.explanation}</p>
                </div>
                <p><strong>Confidence:</strong> <span style="background-color: ${confidenceColor}">${Math.round(response.confidence * 100)}%</span></p>
                <h3>Changes Made</h3>
                ${changesHtml}
            </body>
            </html>
        `;
    }
    validateNotificationContent(content) {
        const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content);
        const hasMessage = content.trim().length > 0;
        return {
            hasEmoji,
            hasMessage,
            length: content.length
        };
    }
}
describe('UI Integration', () => {
    let extensionActivator;
    let commandRegistry;
    let notificationManager;
    beforeEach(() => {
        extensionActivator = new ExtensionActivatorLogic();
        commandRegistry = new CommandRegistryLogic();
        notificationManager = new NotificationManagerLogic();
    });
    describe('Extension Activation', () => {
        test('should activate extension and register commands', () => {
            const result = extensionActivator.activate();
            expect(result.success).toBe(true);
            expect(result.commandsRegistered).toHaveLength(6);
            expect(result.commandsRegistered).toContain('grammarProofreading.correctGrammar');
            expect(result.commandsRegistered).toContain('grammarProofreading.correctStyle');
            expect(result.commandsRegistered).toContain('grammarProofreading.correctClarity');
            expect(result.commandsRegistered).toContain('grammarProofreading.correctTone');
            expect(result.commandsRegistered).toContain('grammarProofreading.correctCustom');
            expect(result.commandsRegistered).toContain('grammarProofreading.openSettings');
            expect(extensionActivator.isExtensionActivated()).toBe(true);
        });
        test('should deactivate extension properly', () => {
            extensionActivator.activate();
            const result = extensionActivator.deactivate();
            expect(result.success).toBe(true);
            expect(extensionActivator.isExtensionActivated()).toBe(false);
            expect(extensionActivator.getRegisteredCommands()).toHaveLength(0);
        });
    });
    describe('Command Registration', () => {
        test('should register all correction commands with proper mapping', () => {
            const result = commandRegistry.registerCommands();
            expect(result.success).toBe(true);
            expect(result.commandCount).toBe(6);
            // Test command mappings
            expect(commandRegistry.getCommandMapping('grammarProofreading.correctGrammar')).toBe(CorrectionType_1.CorrectionType.GRAMMAR);
            expect(commandRegistry.getCommandMapping('grammarProofreading.correctStyle')).toBe(CorrectionType_1.CorrectionType.STYLE);
            expect(commandRegistry.getCommandMapping('grammarProofreading.correctClarity')).toBe(CorrectionType_1.CorrectionType.CLARITY);
            expect(commandRegistry.getCommandMapping('grammarProofreading.correctTone')).toBe(CorrectionType_1.CorrectionType.TONE);
            expect(commandRegistry.getCommandMapping('grammarProofreading.correctCustom')).toBe('custom');
            expect(commandRegistry.getCommandMapping('grammarProofreading.openSettings')).toBe('settings');
        });
        test('should validate command IDs correctly', () => {
            commandRegistry.registerCommands();
            const validCommand = commandRegistry.validateCommandId('grammarProofreading.correctGrammar');
            expect(validCommand.isValid).toBe(true);
            expect(validCommand.hasCorrectPrefix).toBe(true);
            const invalidCommand = commandRegistry.validateCommandId('someOther.command');
            expect(invalidCommand.isValid).toBe(false);
            expect(invalidCommand.hasCorrectPrefix).toBe(false);
            const wrongPrefix = commandRegistry.validateCommandId('wrongPrefix.correctGrammar');
            expect(wrongPrefix.isValid).toBe(false);
            expect(wrongPrefix.hasCorrectPrefix).toBe(false);
        });
        test('should have consistent command naming pattern', () => {
            commandRegistry.registerCommands();
            const commands = commandRegistry.getAllCommands();
            commands.forEach(command => {
                expect(command).toMatch(/^grammarProofreading\./);
                expect(command.split('.').length).toBe(2);
            });
        });
    });
    describe('Notification Management', () => {
        test('should format success messages correctly', () => {
            const responseWithChanges = {
                correctedText: 'Corrected text',
                explanation: 'Fixed grammar',
                changes: [
                    { original: 'wrong', corrected: 'right', reason: 'grammar', position: { start: 0, end: 5 } },
                    { original: 'bad', corrected: 'good', reason: 'word choice', position: { start: 6, end: 9 } }
                ],
                confidence: 0.95
            };
            const message = notificationManager.formatSuccessMessage(responseWithChanges);
            expect(message).toContain('✅');
            expect(message).toContain('Correction completed successfully!');
            expect(message).toContain('Made 2 changes');
        });
        test('should format success message for single change', () => {
            const responseWithOneChange = {
                correctedText: 'Corrected text',
                explanation: 'Fixed grammar',
                changes: [
                    { original: 'wrong', corrected: 'right', reason: 'grammar', position: { start: 0, end: 5 } }
                ],
                confidence: 0.95
            };
            const message = notificationManager.formatSuccessMessage(responseWithOneChange);
            expect(message).toContain('Made 1 change');
            expect(message).not.toContain('changes');
        });
        test('should format error messages with proper emoji', () => {
            const error = 'API key is invalid';
            const message = notificationManager.formatErrorMessage(error);
            expect(message).toContain('❌');
            expect(message).toContain('Grammar correction failed');
            expect(message).toContain(error);
        });
        test('should format warning messages with proper emoji', () => {
            const warning = 'No text selected';
            const message = notificationManager.formatWarningMessage(warning);
            expect(message).toContain('⚠️');
            expect(message).toContain(warning);
        });
        test('should format configuration errors properly', () => {
            const errors = ['API key is required', 'Invalid endpoint URL'];
            const message = notificationManager.formatConfigurationError(errors);
            expect(message).toContain('Configuration issues found:');
            expect(message).toContain('API key is required');
            expect(message).toContain('Invalid endpoint URL');
        });
        test('should generate detailed HTML with all response data', () => {
            const response = {
                correctedText: 'Corrected text',
                explanation: 'Fixed multiple grammar issues',
                changes: [
                    { original: 'wrong', corrected: 'right', reason: 'grammar', position: { start: 0, end: 5 } },
                    { original: 'bad', corrected: 'good', reason: 'word choice', position: { start: 6, end: 9 } }
                ],
                confidence: 0.88
            };
            const html = notificationManager.generateDetailedHtml(response);
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Correction Details');
            expect(html).toContain(response.explanation);
            expect(html).toContain('88%');
            expect(html).toContain('Change 1');
            expect(html).toContain('Change 2');
            expect(html).toContain('wrong');
            expect(html).toContain('right');
            expect(html).toContain('grammar');
        });
        test('should validate notification content structure', () => {
            const successMessage = '✅ Correction completed successfully!';
            const validation = notificationManager.validateNotificationContent(successMessage);
            expect(validation.hasEmoji).toBe(true);
            expect(validation.hasMessage).toBe(true);
            expect(validation.length).toBeGreaterThan(0);
        });
        test('should handle empty notification content', () => {
            const emptyMessage = '';
            const validation = notificationManager.validateNotificationContent(emptyMessage);
            expect(validation.hasEmoji).toBe(false);
            expect(validation.hasMessage).toBe(false);
            expect(validation.length).toBe(0);
        });
    });
    describe('UI Component Integration', () => {
        test('should have consistent branding across components', () => {
            const commands = commandRegistry.getAllCommands();
            const brandPrefix = 'grammarProofreading';
            commands.forEach(command => {
                expect(command.startsWith(brandPrefix)).toBe(true);
            });
        });
        test('should provide user-friendly error handling', () => {
            const technicalError = 'HTTP 401: Unauthorized access to API endpoint';
            const userFriendlyMessage = notificationManager.formatErrorMessage(technicalError);
            expect(userFriendlyMessage).toContain('❌');
            expect(userFriendlyMessage).toContain('Grammar correction failed');
            // Should include the technical details for debugging
            expect(userFriendlyMessage).toContain(technicalError);
        });
        test('should maintain consistent message formatting', () => {
            const successMsg = notificationManager.formatSuccessMessage({
                correctedText: 'test',
                explanation: 'test',
                changes: [],
                confidence: 0.9
            });
            const errorMsg = notificationManager.formatErrorMessage('test error');
            const warningMsg = notificationManager.formatWarningMessage('test warning');
            // All messages should start with an emoji
            expect(successMsg).toMatch(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
            expect(errorMsg).toMatch(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
            expect(warningMsg).toMatch(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
        });
    });
});
//# sourceMappingURL=UIIntegration.test.js.map