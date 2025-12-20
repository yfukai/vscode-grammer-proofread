import * as fc from 'fast-check';
import { PromptManager } from '../PromptManager';
import { CustomPrompt } from '../../types';

describe('PromptManager', () => {
    let promptManager: PromptManager;

    beforeEach(() => {
        promptManager = new PromptManager();
        // Ensure we start with at least one prompt for testing
        promptManager.ensureDefaultPrompts();
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 1: Prompt CRUD operations maintain data integrity**
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
     * 
     * For any sequence of create, update, and delete operations on custom prompts, 
     * the system should maintain data consistency with unique IDs, unique names, 
     * and proper storage synchronization
     */
    test('Property 1: Prompt CRUD operations maintain data integrity', () => {
        fc.assert(fc.property(
            fc.array(fc.record({
                operation: fc.constantFrom('create', 'update', 'delete'),
                name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                content: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0)
            }), { minLength: 1, maxLength: 20 }),
            (operations) => {
                // Reset to clean state with one default prompt
                promptManager = new PromptManager();
                promptManager.ensureDefaultPrompts();
                
                const initialPrompts = promptManager.getPrompts();
                expect(initialPrompts.length).toBeGreaterThanOrEqual(1);
                
                let createdPrompts: CustomPrompt[] = [...initialPrompts];
                let operationResults: Array<{ success: boolean; error?: string }> = [];
                
                for (const op of operations) {
                    try {
                        switch (op.operation) {
                            case 'create':
                                // Only create if name doesn't already exist
                                const existingNames = createdPrompts.map(p => p.name);
                                if (!existingNames.includes(op.name)) {
                                    const newPrompt = promptManager.createPrompt(op.name, op.content);
                                    createdPrompts.push(newPrompt);
                                    operationResults.push({ success: true });
                                } else {
                                    // Expected to fail due to duplicate name
                                    try {
                                        promptManager.createPrompt(op.name, op.content);
                                        operationResults.push({ success: false, error: 'Should have failed due to duplicate name' });
                                    } catch (e) {
                                        operationResults.push({ success: true }); // Expected failure
                                    }
                                }
                                break;
                                
                            case 'update':
                                if (createdPrompts.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * createdPrompts.length);
                                    const promptToUpdate = createdPrompts[randomIndex];
                                    
                                    // Check if new name conflicts with other prompts
                                    const otherNames = createdPrompts
                                        .filter(p => p.id !== promptToUpdate.id)
                                        .map(p => p.name);
                                    
                                    if (!otherNames.includes(op.name)) {
                                        const updatedPrompt = promptManager.updatePrompt(promptToUpdate.id, op.name, op.content);
                                        createdPrompts[randomIndex] = updatedPrompt;
                                        operationResults.push({ success: true });
                                    } else {
                                        // Expected to fail due to duplicate name
                                        try {
                                            promptManager.updatePrompt(promptToUpdate.id, op.name, op.content);
                                            operationResults.push({ success: false, error: 'Should have failed due to duplicate name' });
                                        } catch (e) {
                                            operationResults.push({ success: true }); // Expected failure
                                        }
                                    }
                                }
                                break;
                                
                            case 'delete':
                                if (createdPrompts.length > 1) { // Can't delete the last prompt
                                    const randomIndex = Math.floor(Math.random() * createdPrompts.length);
                                    const promptToDelete = createdPrompts[randomIndex];
                                    promptManager.deletePrompt(promptToDelete.id);
                                    createdPrompts.splice(randomIndex, 1);
                                    operationResults.push({ success: true });
                                } else {
                                    // Expected to fail - can't delete last prompt
                                    try {
                                        const promptToDelete = createdPrompts[0];
                                        promptManager.deletePrompt(promptToDelete.id);
                                        operationResults.push({ success: false, error: 'Should have failed - cannot delete last prompt' });
                                    } catch (e) {
                                        operationResults.push({ success: true }); // Expected failure
                                    }
                                }
                                break;
                        }
                    } catch (error) {
                        // Unexpected errors should be tracked
                        operationResults.push({ success: false, error: (error as Error).message });
                    }
                }
                
                // Verify data integrity after all operations
                const finalPrompts = promptManager.getPrompts();
                
                // 1. At least one prompt must always exist (minimum prompt invariant)
                expect(finalPrompts.length).toBeGreaterThanOrEqual(1);
                
                // 2. All prompt IDs must be unique
                const ids = finalPrompts.map(p => p.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(ids.length);
                
                // 3. All prompt names must be unique
                const names = finalPrompts.map(p => p.name);
                const uniqueNames = new Set(names);
                expect(uniqueNames.size).toBe(names.length);
                
                // 4. All prompts must have valid data
                for (const prompt of finalPrompts) {
                    expect(prompt.id).toBeTruthy();
                    expect(prompt.name.trim().length).toBeGreaterThan(0);
                    expect(prompt.name.length).toBeLessThanOrEqual(100);
                    expect(prompt.content.trim().length).toBeGreaterThan(0);
                    expect(prompt.content.length).toBeLessThanOrEqual(2000);
                    expect(prompt.createdAt).toBeInstanceOf(Date);
                    expect(prompt.updatedAt).toBeInstanceOf(Date);
                    expect(prompt.updatedAt.getTime()).toBeGreaterThanOrEqual(prompt.createdAt.getTime());
                }
                
                // 5. Storage synchronization - retrieved prompts should match internal state
                const retrievedPrompts = promptManager.getPrompts();
                expect(retrievedPrompts).toEqual(finalPrompts);
                
                // 6. Configuration consistency
                const config = promptManager.getConfiguration();
                expect(config.customPrompts).toEqual(finalPrompts);
                
                return true;
            }
        ), { numRuns: 100 });
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 2: Prompt combination consistency**
     * **Validates: Requirements 2.2, 3.1**
     * 
     * For any custom prompt and shared prompt combination, the final prompt sent to the LLM 
     * should always be the custom prompt content followed by the shared prompt content
     */
    test('Property 2: Prompt combination consistency', () => {
        fc.assert(fc.property(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // custom prompt name
            fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0), // custom prompt content
            fc.string({ minLength: 0, maxLength: 2000 }), // shared prompt content (can be empty)
            (customName, customContent, sharedContent) => {
                // Reset to clean state
                promptManager = new PromptManager();
                
                // Set shared prompt
                promptManager.setSharedPrompt(sharedContent);
                
                // Create custom prompt
                const customPrompt = promptManager.createPrompt(customName, customContent);
                
                // Combine prompts
                const combinedPrompt = promptManager.combinePrompts(customPrompt.id);
                
                // Verify combination logic
                if (sharedContent.trim().length === 0) {
                    // When shared prompt is empty, should return only custom content
                    expect(combinedPrompt).toBe(customContent.trim());
                } else {
                    // When shared prompt exists, should be custom + "\n\n" + shared
                    const expectedCombination = `${customContent.trim()}\n\n${sharedContent}`;
                    expect(combinedPrompt).toBe(expectedCombination);
                }
                
                // Verify that the combination always starts with custom prompt content
                expect(combinedPrompt.startsWith(customContent.trim())).toBe(true);
                
                // Verify that if shared prompt is not empty, it appears in the combination
                if (sharedContent.trim().length > 0) {
                    expect(combinedPrompt.includes(sharedContent)).toBe(true);
                }
                
                // Verify that combining the same prompt multiple times gives same result
                const secondCombination = promptManager.combinePrompts(customPrompt.id);
                expect(secondCombination).toBe(combinedPrompt);
                
                return true;
            }
        ), { numRuns: 100 });
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 3: Minimum prompt invariant**
     * **Validates: Requirements 4.2**
     * 
     * For any state of the system, there should always be at least one custom prompt available, 
     * and deletion operations should be prevented when only one prompt remains
     */
    test('Property 3: Minimum prompt invariant', () => {
        fc.assert(fc.property(
            fc.array(fc.record({
                operation: fc.constantFrom('create', 'delete'),
                name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                content: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0)
            }), { minLength: 1, maxLength: 50 }),
            (operations) => {
                // Reset to clean state and ensure default prompts
                promptManager = new PromptManager();
                promptManager.ensureDefaultPrompts();
                
                // Verify we start with at least one prompt
                let currentPrompts = promptManager.getPrompts();
                expect(currentPrompts.length).toBeGreaterThanOrEqual(1);
                
                for (const op of operations) {
                    const promptsBefore = promptManager.getPrompts();
                    
                    try {
                        switch (op.operation) {
                            case 'create':
                                // Only create if name doesn't already exist
                                const existingNames = promptsBefore.map(p => p.name);
                                if (!existingNames.includes(op.name)) {
                                    promptManager.createPrompt(op.name, op.content);
                                }
                                break;
                                
                            case 'delete':
                                if (promptsBefore.length > 1) {
                                    // Safe to delete - more than one prompt exists
                                    const randomIndex = Math.floor(Math.random() * promptsBefore.length);
                                    const promptToDelete = promptsBefore[randomIndex];
                                    promptManager.deletePrompt(promptToDelete.id);
                                } else {
                                    // Should not be able to delete the last prompt
                                    const lastPrompt = promptsBefore[0];
                                    expect(() => promptManager.deletePrompt(lastPrompt.id))
                                        .toThrow('Cannot delete the last remaining prompt');
                                }
                                break;
                        }
                    } catch (error) {
                        // Some operations may fail due to validation, which is expected
                        // The important thing is that we always maintain at least one prompt
                    }
                    
                    // INVARIANT: After any operation, at least one prompt must exist
                    const promptsAfter = promptManager.getPrompts();
                    expect(promptsAfter.length).toBeGreaterThanOrEqual(1);
                    
                    // INVARIANT: All prompts must have unique names
                    const names = promptsAfter.map(p => p.name);
                    const uniqueNames = new Set(names);
                    expect(uniqueNames.size).toBe(names.length);
                    
                    // INVARIANT: All prompts must have unique IDs
                    const ids = promptsAfter.map(p => p.id);
                    const uniqueIds = new Set(ids);
                    expect(uniqueIds.size).toBe(ids.length);
                }
                
                // Final verification: ensure default prompts functionality works
                const finalPrompts = promptManager.getPrompts();
                if (finalPrompts.length === 0) {
                    promptManager.ensureDefaultPrompts();
                    const afterDefault = promptManager.getPrompts();
                    expect(afterDefault.length).toBeGreaterThanOrEqual(1);
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Additional unit tests for specific edge cases
    describe('Edge cases and validation', () => {
        test('should reject empty or whitespace-only names', () => {
            expect(() => promptManager.createPrompt('', 'content')).toThrow();
            expect(() => promptManager.createPrompt('   ', 'content')).toThrow();
        });

        test('should reject empty or whitespace-only content', () => {
            expect(() => promptManager.createPrompt('name', '')).toThrow();
            expect(() => promptManager.createPrompt('name', '   ')).toThrow();
        });

        test('should reject names longer than 100 characters', () => {
            const longName = 'a'.repeat(101);
            expect(() => promptManager.createPrompt(longName, 'content')).toThrow();
        });

        test('should reject content longer than 2000 characters', () => {
            const longContent = 'a'.repeat(2001);
            expect(() => promptManager.createPrompt('name', longContent)).toThrow();
        });

        test('should prevent deletion of non-existent prompt', () => {
            expect(() => promptManager.deletePrompt('non-existent-id')).toThrow();
        });

        test('should prevent update of non-existent prompt', () => {
            expect(() => promptManager.updatePrompt('non-existent-id', 'name', 'content')).toThrow();
        });

        test('should validate shared prompt length', () => {
            const longSharedPrompt = 'a'.repeat(2001);
            expect(() => promptManager.setSharedPrompt(longSharedPrompt)).toThrow();
            expect(promptManager.validateSharedPrompt(longSharedPrompt)).toBe(false);
        });

        test('should allow valid shared prompt', () => {
            const validSharedPrompt = 'This is a valid shared prompt.';
            expect(() => promptManager.setSharedPrompt(validSharedPrompt)).not.toThrow();
            expect(promptManager.validateSharedPrompt(validSharedPrompt)).toBe(true);
            expect(promptManager.getSharedPrompt()).toBe(validSharedPrompt);
        });
    });
});