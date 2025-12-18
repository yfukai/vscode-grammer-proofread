import * as vscode from 'vscode';
import { ExtensionActivator } from './ui/ExtensionActivator';

let extensionActivator: ExtensionActivator;

export function activate(context: vscode.ExtensionContext) {
    extensionActivator = new ExtensionActivator();
    extensionActivator.activate(context);
}

export function deactivate() {
    if (extensionActivator) {
        extensionActivator.deactivate();
    }
}