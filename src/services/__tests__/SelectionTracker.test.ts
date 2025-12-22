import { SelectionTracker } from '../SelectionTracker';
import { TextSelection, ActiveTask } from '../../types';

describe('SelectionTracker', () => {
    let selectionTracker: SelectionTracker;

    beforeEach(() => {
        selectionTracker = new SelectionTracker();
    });

    describe('isOverlapping', () => {
        test('should return false for different documents', () => {
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
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(false);
        });

        test('should return false for non-overlapping selections in same document', () => {
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
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(false);
        });

        test('should return false for adjacent selections (touching but not overlapping)', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 1,
                startCharacter: 10,
                endLine: 2,
                endCharacter: 20
            };
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(false);
        });

        test('should return true for overlapping selections', () => {
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
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(true);
        });

        test('should return true for identical selections', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 1,
                endCharacter: 10
            };
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(true);
        });

        test('should return true for contained selections', () => {
            const selection1: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 0,
                startCharacter: 0,
                endLine: 5,
                endCharacter: 50
            };
            
            const selection2: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 2,
                startCharacter: 10,
                endLine: 3,
                endCharacter: 20
            };
            
            expect(selectionTracker.isOverlapping(selection1, selection2)).toBe(true);
            expect(selectionTracker.isOverlapping(selection2, selection1)).toBe(true);
        });
    });

    describe('task management', () => {
        test('should add and track tasks', () => {
            const task: ActiveTask = {
                id: 'task1',
                selection: {
                    documentUri: 'file:///doc1.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 1,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            selectionTracker.addTask(task);
            const activeTasks = selectionTracker.getActiveTasks();
            
            expect(activeTasks.length).toBe(1);
            expect(activeTasks[0]).toEqual(task);
        });

        test('should remove tasks', () => {
            const task: ActiveTask = {
                id: 'task1',
                selection: {
                    documentUri: 'file:///doc1.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 1,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            selectionTracker.addTask(task);
            expect(selectionTracker.getActiveTasks().length).toBe(1);
            
            selectionTracker.removeTask('task1');
            expect(selectionTracker.getActiveTasks().length).toBe(0);
        });

        test('should find overlapping tasks', () => {
            const task1: ActiveTask = {
                id: 'task1',
                selection: {
                    documentUri: 'file:///doc1.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 2,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            const task2: ActiveTask = {
                id: 'task2',
                selection: {
                    documentUri: 'file:///doc2.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 1,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            selectionTracker.addTask(task1);
            selectionTracker.addTask(task2);
            
            const overlappingSelection: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 1,
                startCharacter: 5,
                endLine: 3,
                endCharacter: 15
            };
            
            const overlappingTasks = selectionTracker.getOverlappingTasks(overlappingSelection);
            
            expect(overlappingTasks.length).toBe(1);
            expect(overlappingTasks[0].id).toBe('task1');
        });

        test('should check if selection has overlapping tasks', () => {
            const task: ActiveTask = {
                id: 'task1',
                selection: {
                    documentUri: 'file:///doc1.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 2,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            selectionTracker.addTask(task);
            
            const overlappingSelection: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 1,
                startCharacter: 5,
                endLine: 3,
                endCharacter: 15
            };
            
            const nonOverlappingSelection: TextSelection = {
                documentUri: 'file:///doc1.txt',
                startLine: 5,
                startCharacter: 0,
                endLine: 6,
                endCharacter: 10
            };
            
            expect(selectionTracker.hasOverlappingTasks(overlappingSelection)).toBe(true);
            expect(selectionTracker.hasOverlappingTasks(nonOverlappingSelection)).toBe(false);
        });

        test('should clear all tasks', () => {
            const task1: ActiveTask = {
                id: 'task1',
                selection: {
                    documentUri: 'file:///doc1.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 1,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            const task2: ActiveTask = {
                id: 'task2',
                selection: {
                    documentUri: 'file:///doc2.txt',
                    startLine: 0,
                    startCharacter: 0,
                    endLine: 1,
                    endCharacter: 10
                },
                startTime: new Date()
            };
            
            selectionTracker.addTask(task1);
            selectionTracker.addTask(task2);
            expect(selectionTracker.getActiveTasks().length).toBe(2);
            
            selectionTracker.clear();
            expect(selectionTracker.getActiveTasks().length).toBe(0);
        });
    });
});