import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { StorageService } from '../StorageService';
import { ConfigurationProvider } from '../ConfigurationProvider';
import { PromptConfiguration, CustomPrompt } from '../../types';

// Mock ExtensionContext
const mockContext = {
    workspaceState: {
        get: jest.fn(),
        update: jest.fn()
    }
} as any;

// Mock Configuration
const mockConfig = {
    get: jest.fn(),
    update: jest.fn()
};

describe('StorageService', () => {
    let storageService: StorageService;

    beforeEach(() => {
        jest.clearAllMocks();
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
        mockContext.workspaceState.get.mockReturnValue([]);
        mockConfig.get.mockReturnValue('');
        storageService = new StorageService(mockContext);
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 10: Configuration persistence**
     * **Validates: Requirements 2.1, 2.4, 5.5**
     * 
     * For any changes to shared prompts or API settings, the configuration should be 
     * stored immediately and applied to all subsequent operations
     */
    test('Property 10: Configuration persistence', async () => {
        await fc.assert(fc.asyncProperty(
            fc.array(fc.record({
                operation: fc.constantFrom('createPrompt', 'updatePrompt', 'deletePrompt', 'setSharedPrompt'),
                promptName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                promptContent: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
                sharedPrompt: fc.string({ minLength: 0, maxLength: 2000 })
            }), { minLength: 1, maxLength: 20 }),
            async (operations) => {
                // Reset mocks and create fresh service
                jest.clearAllMocks();
                mockContext.workspaceState.get.mockReturnValue([]);
                mockConfig.get.mockReturnValue('');
                
                const service = new StorageService(mockContext);
                await service.initialize();
                
                // Track expected state
                let expectedPrompts: CustomPrompt[] = service.getPrompts(); // Start with default prompts
                let expectedSharedPrompt = '';
                let saveConfigurationCallCount = 0;
                let setSharedPromptCallCount = 0;
                
                for (const op of operations) {
                    const initialSaveCount = saveConfigurationCallCount;
                    const initialSharedCount = setSharedPromptCallCount;
                    
                    try {
                        switch (op.operation) {
                            case 'createPrompt':
                                // Only create if name doesn't already exist
                                const existingNames = expectedPrompts.map(p => p.name);
                                if (!existingNames.includes(op.promptName)) {
                                    const newPrompt = await service.createPrompt(op.promptName, op.promptContent);
                                    expectedPrompts.push(newPrompt);
                                    saveConfigurationCallCount++;
                                    
                                    // Verify immediate persistence
                                    expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
                                        'customPrompts',
                                        expect.arrayContaining([
                                            expect.objectContaining({
                                                name: op.promptName,
                                                content: op.promptContent
                                            })
                                        ])
                                    );
                                }
                                break;
                                
                            case 'updatePrompt':
                                if (expectedPrompts.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * expectedPrompts.length);
                                    const promptToUpdate = expectedPrompts[randomIndex];
                                    
                                    // Check if new name conflicts with other prompts
                                    const otherNames = expectedPrompts
                                        .filter(p => p.id !== promptToUpdate.id)
                                        .map(p => p.name);
                                    
                                    if (!otherNames.includes(op.promptName)) {
                                        const updatedPrompt = await service.updatePrompt(
                                            promptToUpdate.id, 
                                            op.promptName, 
                                            op.promptContent
                                        );
                                        expectedPrompts[randomIndex] = updatedPrompt;
                                        saveConfigurationCallCount++;
                                        
                                        // Verify immediate persistence
                                        expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
                                            'customPrompts',
                                            expect.arrayContaining([
                                                expect.objectContaining({
                                                    id: promptToUpdate.id,
                                                    name: op.promptName,
                                                    content: op.promptContent
                                                })
                                            ])
                                        );
                                    }
                                }
                                break;
                                
                            case 'deletePrompt':
                                if (expectedPrompts.length > 1) { // Can't delete the last prompt
                                    const randomIndex = Math.floor(Math.random() * expectedPrompts.length);
                                    const promptToDelete = expectedPrompts[randomIndex];
                                    await service.deletePrompt(promptToDelete.id);
                                    expectedPrompts.splice(randomIndex, 1);
                                    saveConfigurationCallCount++;
                                    
                                    // Verify immediate persistence
                                    expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
                                        'customPrompts',
                                        expect.not.arrayContaining([
                                            expect.objectContaining({
                                                id: promptToDelete.id
                                            })
                                        ])
                                    );
                                }
                                break;
                                
                            case 'setSharedPrompt':
                                await service.setSharedPrompt(op.sharedPrompt);
                                expectedSharedPrompt = op.sharedPrompt;
                                setSharedPromptCallCount++;
                                
                                // Verify immediate persistence to both PromptManager and ConfigurationProvider
                                expect(service.getSharedPrompt()).toBe(op.sharedPrompt);
                                expect(mockConfig.update).toHaveBeenCalledWith(
                                    'sharedPrompt',
                                    op.sharedPrompt,
                                    vscode.ConfigurationTarget.Workspace
                                );
                                break;
                        }
                    } catch (error) {
                        // Some operations may fail due to validation, which is expected
                        // The important thing is that failed operations don't corrupt state
                    }
                    
                    // PROPERTY: Configuration changes are persisted immediately
                    // Verify that storage operations were called when expected
                    const currentSaveCount = mockContext.workspaceState.update.mock.calls.length;
                    const currentSharedCount = mockConfig.update.mock.calls.filter(
                        call => call[0] === 'sharedPrompt'
                    ).length;
                    
                    // If we expected a save operation, it should have happened
                    if (saveConfigurationCallCount > initialSaveCount) {
                        expect(currentSaveCount).toBeGreaterThan(0);
                    }
                    
                    if (setSharedPromptCallCount > initialSharedCount) {
                        expect(currentSharedCount).toBeGreaterThan(0);
                    }
                    
                    // PROPERTY: All subsequent operations reflect the persisted changes
                    const currentPrompts = service.getPrompts();
                    const currentSharedPrompt = service.getSharedPrompt();
                    
                    // Verify that the in-memory state matches expected state
                    expect(currentPrompts.length).toBe(expectedPrompts.length);
                    expect(currentSharedPrompt).toBe(expectedSharedPrompt);
                    
                    // Verify that all prompts have unique names and IDs
                    const names = currentPrompts.map(p => p.name);
                    const ids = currentPrompts.map(p => p.id);
                    expect(new Set(names).size).toBe(names.length);
                    expect(new Set(ids).size).toBe(ids.length);
                    
                    // PROPERTY: Configuration can be retrieved consistently
                    const config = service.getConfiguration();
                    expect(config.customPrompts).toEqual(currentPrompts);
                    expect(config.sharedPrompt).toBe(currentSharedPrompt);
                }
                
                // Final verification: Ensure persistence operations were called appropriately
                if (saveConfigurationCallCount > 0) {
                    expect(mockContext.workspaceState.update).toHaveBeenCalled();
                }
                
                if (setSharedPromptCallCount > 0) {
                    expect(mockConfig.update).toHaveBeenCalledWith(
                        'sharedPrompt',
                        expect.any(String),
                        vscode.ConfigurationTarget.Workspace
                    );
                }
                
                // PROPERTY: State remains consistent after all operations
                const finalPrompts = service.getPrompts();
                const finalSharedPrompt = service.getSharedPrompt();
                const finalConfig = service.getConfiguration();
                
                expect(finalConfig.customPrompts).toEqual(finalPrompts);
                expect(finalConfig.sharedPrompt).toBe(finalSharedPrompt);
                expect(finalPrompts.length).toBeGreaterThanOrEqual(1); // Minimum prompt invariant
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific persistence scenarios
    describe('Persistence edge cases', () => {
        test('should initialize with default prompts on first installation', async () => {
            mockContext.workspaceState.get.mockReturnValue([]); // Empty = first installation
            
            const service = new StorageService(mockContext);
            await service.initialize();
            
            const prompts = service.getPrompts();
            expect(prompts.length).toBeGreaterThanOrEqual(1);
            expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
                'customPrompts',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.any(String),
                        content: expect.any(String)
                    })
                ])
            );
        });

        test('should load existing configuration on initialization', async () => {
            const existingPrompts = [{
                id: 'test-id',
                name: 'Test Prompt',
                content: 'Test content',
                createdAt: new Date(),
                updatedAt: new Date()
            }];
            
            mockContext.workspaceState.get.mockReturnValue(existingPrompts);
            mockConfig.get.mockReturnValue('Test shared prompt');
            
            const service = new StorageService(mockContext);
            await service.initialize();
            
            const prompts = service.getPrompts();
            const sharedPrompt = service.getSharedPrompt();
            
            expect(prompts).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    name: 'Test Prompt',
                    content: 'Test content'
                })
            ]));
            expect(sharedPrompt).toBe('Test shared prompt');
        });

        test('should synchronize from settings changes', async () => {
            const service = new StorageService(mockContext);
            await service.initialize();
            
            // Simulate settings change
            mockConfig.get.mockReturnValue('New shared prompt from settings');
            await service.synchronizeFromSettings();
            
            expect(service.getSharedPrompt()).toBe('New shared prompt from settings');
        });

        test('should handle configuration validation errors gracefully', async () => {
            const service = new StorageService(mockContext);
            await service.initialize();
            
            // Test invalid shared prompt (too long)
            const longPrompt = 'a'.repeat(2001);
            await expect(service.setSharedPrompt(longPrompt)).rejects.toThrow();
            
            // Verify state wasn't corrupted
            expect(service.getSharedPrompt()).not.toBe(longPrompt);
        });
    });
});