import * as fc from 'fast-check';
import { TaskManager } from '../TaskManager';
import { SelectionTracker } from '../SelectionTracker';
import { TextSelection, ActiveTask } from '../../types';

describe('TaskManager', () => {
    let taskManager: TaskManager;
    let selectionTracker: SelectionTracker;

    beforeEach(() => {
        selectionTracker = new SelectionTracker();
        taskManager = new TaskManager(selectionTracker);
    });

    /**
     * **Feature: grammar-proofreading-extension, Property 6: Selection-based concurrency control**
     * **Validates: Requirements 10.1, 10.2, 10.3**
     * 
     * For any text selection in any document, only one correction task should be allowed on that specific selection, 
     * while non-overlapping selections in the same document or selections in different documents should be allowed 
     * to run concurrently
     */
    test('Property 6: Selection-based concurrency control', () => {
        fc.assert(fc.property(
            // Generate multiple text selections with various overlap scenarios
            fc.array(fc.record({
                documentUri: fc.constantFrom('file:///doc1.txt', 'file:///doc2.txt', 'file:///doc3.txt'),
                startLine: fc.integer({ min: 0, max: 100 }),
                startCharacter: fc.integer({ min: 0, max: 100 }),
                endLine: fc.integer({ min: 0, max: 100 }),
                endCharacter: fc.integer({ min: 0, max: 100 })
            }).map(sel => {
                // Ensure end is after start
                const startLine = Math.min(sel.startLine, sel.endLine);
                const endLine = Math.max(sel.startLine, sel.endLine);
                const startChar = startLine === endLine ? Math.min(sel.startCharacter, sel.endCharacter) : sel.startCharacter;
                const endChar = startLine === endLine ? Math.max(sel.startCharacter, sel.endCharacter) : sel.endCharacter;
                
                return {
                    documentUri: sel.documentUri,
                    startLine,
                    startCharacter: startChar,
                    endLine,
                    endCharacter: endChar
                } as TextSelection;
            }), { minLength: 1, maxLength: 20 }),
            (selections) => {
                // Reset task manager state
                taskManager.clearAllTasks();
                
                const startedTasks: string[] = [];
                const failedAttempts: Array<{ selection: TextSelection; reason: string }> = [];
                
                // Attempt to start tasks for each selection
                for (const selection of selections) {
                    try {
                        if (taskManager.canStartTask(selection)) {
                            const taskId = taskManager.startTask(selection);
                            startedTasks.push(taskId);
                        } else {
                            // Task should be blocked due to overlapping selection
                            const conflictingTasks = taskManager.getConflictingTasks(selection);
                            expect(conflictingTasks.length).toBeGreaterThan(0);
                            failedAttempts.push({ selection, reason: 'overlapping' });
                        }
                    } catch (error) {
                        // Should only fail if there's an overlapping task
                        const conflictingTasks = taskManager.getConflictingTasks(selection);
                        expect(conflictingTasks.length).toBeGreaterThan(0);
                        failedAttempts.push({ selection, reason: 'exception' });
                    }
                }
                
                const activeTasks = taskManager.getActiveTasks();
                
                // PROPERTY 1: Number of active tasks should equal number of successfully started tasks
                expect(activeTasks.length).toBe(startedTasks.length);
                
                // PROPERTY 2: No two active tasks should have overlapping selections in the same document
                for (let i = 0; i < activeTasks.length; i++) {
                    for (let j = i + 1; j < activeTasks.length; j++) {
                        const task1 = activeTasks[i];
                        const task2 = activeTasks[j];
                        
                        if (task1.selection.documentUri === task2.selection.documentUri) {
                            // Same document - selections should not overlap
                            expect(taskManager.isSelectionOverlapping(task1.selection, task2.selection)).toBe(false);
                        }
                        // Different documents can have any selections without conflict
                    }
                }
                
                // PROPERTY 3: All failed attempts should have valid reasons (overlapping tasks)
                for (const failed of failedAttempts) {
                    const conflictingTasks = taskManager.getConflictingTasks(failed.selection);
                    expect(conflictingTasks.length).toBeGreaterThan(0);
                    
                    // At least one conflicting task should overlap with the failed selection
                    const hasOverlap = conflictingTasks.some(task => 
                        taskManager.isSelectionOverlapping(task.selection, failed.selection)
                    );
                    expect(hasOverlap).toBe(true);
                }
                
                // PROPERTY 4: canStartTask should be consistent with actual start attempts
                for (const selection of selections) {
                    const canStart = taskManager.canStartTask(selection);
                    const conflictingTasks = taskManager.getConflictingTasks(selection);
                    
                    if (canStart) {
                        expect(conflictingTasks.length).toBe(0);
                    } else {
                        expect(conflictingTasks.length).toBeGreaterThan(0);
                    }
                }
                
                // PROPERTY 5: After completing some tasks, previously blocked selections should become available
                if (startedTasks.length > 0) {
                    // Complete half of the tasks
                    const tasksToComplete = startedTasks.slice(0, Math.ceil(startedTasks.length / 2));
                    for (const taskId of tasksToComplete) {
                        taskManager.completeTask(taskId);
                    }
                    
                    // Verify that completed tasks are no longer active
                    const remainingTasks = taskManager.getActiveTasks();
                    const remainingTaskIds = remainingTasks.map(t => t.id);
                    
                    for (const completedTaskId of tasksToComplete) {
                        expect(remainingTaskIds).not.toContain(completedTaskId);
                    }
                    
                    // Some previously failed selections might now be available
                    for (const failed of failedAttempts) {
                        const nowCanStart = taskManager.canStartTask(failed.selection);
                        const nowConflicting = taskManager.getConflictingTasks(failed.selection);
                        
                        if (nowCanStart) {
                            expect(nowConflicting.length).toBe(0);
                        } else {
                            expect(nowConflicting.length).toBeGreaterThan(0);
                        }
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    // Unit tests for specific edge cases and validation
    describe('Edge cases and validation', () => {
        test('should allow tasks on different documents', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc2.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            expect(taskManager.canStartTask(selection1)).toBe(true);
            const task1Id = taskManager.startTask(selection1);
            
            expect(taskManager.canStartTask(selection2)).toBe(true);
            const task2Id = taskManager.startTask(selection2);
            
            expect(taskManager.getActiveTasks().length).toBe(2);
            expect(task1Id).not.toBe(task2Id);
        });

        test('should prevent overlapping tasks in same document', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 2,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 1,
                startCharacter: 5,
                endLine: 3,
                endCharacter: 15
            };
            
            expect(taskManager.canStartTask(selection1)).toBe(true);
            const task1Id = taskManager.startTask(selection1);
            
            expect(taskManager.canStartTask(selection2)).toBe(false);
            expect(() => taskManager.startTask(selection2)).toThrow();
            
            expect(taskManager.getActiveTasks().length).toBe(1);
        });

        test('should allow non-overlapping tasks in same document', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 2,
                startCharacter: 0,
                endLine: 3,
                endCharacter: 10
            };
            
            expect(taskManager.canStartTask(selection1)).toBe(true);
            const task1Id = taskManager.startTask(selection1);
            
            expect(taskManager.canStartTask(selection2)).toBe(true);
            const task2Id = taskManager.startTask(selection2);
            
            expect(taskManager.getActiveTasks().length).toBe(2);
            expect(task1Id).not.toBe(task2Id);
        });

        test('should handle task completion correctly', () => {
            const selection: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const taskId = taskManager.startTask(selection);
            expect(taskManager.getActiveTasks().length).toBe(1);
            
            taskManager.completeTask(taskId);
            expect(taskManager.getActiveTasks().length).toBe(0);
            
            // Should be able to start a new task on the same selection
            expect(taskManager.canStartTask(selection)).toBe(true);
        });

        test('should handle task cancellation correctly', () => {
            const selection: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const taskId = taskManager.startTask(selection);
            expect(taskManager.getActiveTasks().length).toBe(1);
            
            taskManager.cancelTask(taskId);
            expect(taskManager.getActiveTasks().length).toBe(0);
            
            // Should be able to start a new task on the same selection
            expect(taskManager.canStartTask(selection)).toBe(true);
        });

        test('should return correct conflicting tasks', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 2,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 1,
                startCharacter: 5,
                endLine: 3,
                endCharacter: 15
            };
            
            const taskId = taskManager.startTask(selection1);
            const conflictingTasks = taskManager.getConflictingTasks(selection2);
            
            expect(conflictingTasks.length).toBe(1);
            expect(conflictingTasks[0].id).toBe(taskId);
            expect(conflictingTasks[0].selection).toEqual(selection1);
        });
    });
});