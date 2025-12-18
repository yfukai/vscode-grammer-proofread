"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionActivator = void 0;
const CommandRegistry_1 = require("./CommandRegistry");
const StatusBarManager_1 = require("./StatusBarManager");
class ExtensionActivator {
    constructor() {
        this.commandRegistry = new CommandRegistry_1.CommandRegistry();
        this.statusBarManager = new StatusBarManager_1.StatusBarManager();
    }
    activate(context) {
        console.log('Grammar Proofreading Extension is activating...');
        // Register commands
        this.commandRegistry.registerCommands(context);
        // Initialize status bar
        this.statusBarManager.initialize(context);
        console.log('Grammar Proofreading Extension activated successfully!');
    }
    deactivate() {
        console.log('Grammar Proofreading Extension is deactivating...');
        this.statusBarManager.dispose();
    }
}
exports.ExtensionActivator = ExtensionActivator;
//# sourceMappingURL=ExtensionActivator.js.map