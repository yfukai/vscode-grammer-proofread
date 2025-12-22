import { TextSelection, ActiveTask } from '../types';
import { SelectionTracker } from './SelectionTracker';

/**
 * Simple ID generator for tasks
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Manages active correction tasks and enforces concurrency control
 */
export class TaskManager {
  private selectionTracker: SelectionTracker;

  constructor(selectionTracker?: SelectionTracker) {
    this.selectionTracker = selectionTracker || new SelectionTracker();
  }

  /**
   * Checks if a new task can be started on the given selection
   * @param selection The text selection for the proposed task
   * @returns true if the task can be started, false if blocked by overlapping tasks
   */
  canStartTask(selection: TextSelection): boolean {
    return !this.selectionTracker.hasOverlappingTasks(selection);
  }

  /**
   * Starts a new task on the given selection
   * @param selection The text selection for the task
   * @returns The task ID if successful
   * @throws Error if the selection is blocked by overlapping tasks
   */
  startTask(selection: TextSelection): string {
    if (!this.canStartTask(selection)) {
      throw new Error('Cannot start task: selection is currently being processed by another task');
    }

    const taskId = generateTaskId();
    const task: ActiveTask = {
      id: taskId,
      selection,
      startTime: new Date()
    };

    this.selectionTracker.addTask(task);
    return taskId;
  }

  /**
   * Completes a task and removes it from tracking
   * @param taskId The ID of the task to complete
   */
  completeTask(taskId: string): void {
    this.selectionTracker.removeTask(taskId);
  }

  /**
   * Gets all tasks that conflict with the given selection
   * @param selection The selection to check for conflicts
   * @returns Array of conflicting active tasks
   */
  getConflictingTasks(selection: TextSelection): ActiveTask[] {
    return this.selectionTracker.getOverlappingTasks(selection);
  }

  /**
   * Checks if two selections overlap
   * @param sel1 First selection
   * @param sel2 Second selection
   * @returns true if selections overlap, false otherwise
   */
  isSelectionOverlapping(sel1: TextSelection, sel2: TextSelection): boolean {
    return this.selectionTracker.isOverlapping(sel1, sel2);
  }

  /**
   * Gets all currently active tasks
   * @returns Array of all active tasks
   */
  getActiveTasks(): ActiveTask[] {
    return this.selectionTracker.getActiveTasks();
  }

  /**
   * Cancels a task by removing it from tracking
   * @param taskId The ID of the task to cancel
   */
  cancelTask(taskId: string): void {
    this.selectionTracker.removeTask(taskId);
  }

  /**
   * Clears all active tasks (useful for testing or reset scenarios)
   */
  clearAllTasks(): void {
    this.selectionTracker.clear();
  }
}