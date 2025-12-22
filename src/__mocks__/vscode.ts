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
    showWarningMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
        text: '',
        tooltip: '',
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
    })),
    createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        clear: jest.fn(),
        dispose: jest.fn()
    })),
    withProgress: jest.fn((options, task) => task({ report: jest.fn() })),
    onDidChangeTextEditorSelection: jest.fn(() => ({
        dispose: jest.fn()
    })),
    onDidChangeActiveTextEditor: jest.fn(() => ({
        dispose: jest.fn()
    }))
};

export const commands = {
    registerCommand: jest.fn(() => ({
        dispose: jest.fn()
    }))
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

export const ExtensionMode = {
    Production: 1,
    Development: 2,
    Test: 3
};

export const StatusBarAlignment = {
    Left: 1,
    Right: 2
};

export const ProgressLocation = {
    SourceControl: 1,
    Window: 10,
    Notification: 15
};