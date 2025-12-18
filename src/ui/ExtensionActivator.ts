import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry';
import { StatusBarManager } from './StatusBarManager';

export class ExtensionActivator {
    private commandRegistry: CommandRegistry;
    private statusBarManager: StatusBarManager;

    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.statusBarManager = new StatusBarManager();
    }

    activate(context: vscode.ExtensionContext): void {
        console.log('Grammar Proofreading Extension is activating...');

        // Register commands
        this.commandRegistry.registerCommands(context);

        // Initialize status bar
        this.statusBarManager.initialize(context);

        console.log('Grammar Proofreading Extension activated successfully!');
    }

    deactivate(): void {
        console.log('Grammar Proofreading Extension is deactivating...');
        this.statusBarManager.dispose();
    }
}