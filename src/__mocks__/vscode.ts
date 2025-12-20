/**
 * Mock implementation of VSCode API for testing
 */

export const workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(() => ({
        dispose: jest.fn()
    }))
};

export const window = {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn()
};

export const commands = {
    registerCommand: jest.fn()
};

export const Uri = {
    parse: jest.fn()
};

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
};

export const ExtensionContext = jest.fn();