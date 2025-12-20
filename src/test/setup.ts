/**
 * Jest test setup configuration
 */

// Global test timeout
jest.setTimeout(10000);

// Mock VSCode API for testing
const mockVscode = {
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn()
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn()
  },
  commands: {
    registerCommand: jest.fn()
  },
  Uri: {
    parse: jest.fn()
  }
};

// Make VSCode API available globally for tests
(global as any).vscode = mockVscode;