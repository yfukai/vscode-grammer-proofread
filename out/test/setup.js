"use strict";
// Jest setup file for VSCode extension testing
// This will be used to configure the testing environment
// Mock VSCode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
            update: jest.fn().mockResolvedValue(undefined)
        })
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        withProgress: jest.fn().mockImplementation((options, task) => task({ report: jest.fn() }))
    },
    commands: {
        executeCommand: jest.fn()
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3
    },
    ProgressLocation: {
        Notification: 15
    }
}), { virtual: true });
// Mock node-fetch
jest.mock('node-fetch', () => ({
    default: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
        text: jest.fn().mockResolvedValue('')
    })
}), { virtual: true });
//# sourceMappingURL=setup.js.map