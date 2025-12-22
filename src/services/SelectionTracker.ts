import { TextSelection, ActiveTask } from '../types';

/**
 * Manages selection overlap detection for concurrency control
 */
export class SelectionTracker {
  private activeTasks: Map<string, ActiveTask> = new Map();

  /**
   * Checks if two text selections overlap
   * @param selection1 First text selection
   * @param selection2 Second text selection
   * @returns true if selections overlap, false otherwise
   */
  isOverlapping(selection1: TextSelection, selection2: TextSelection): boolean {
    // Different documents never overlap
    if (selection1.documentUri !== selection2.documentUri) {
      return false;
    }

    // Check if selections are completely separate (no overlap)
    // Selection 1 ends before selection 2 starts
    if (selection1.endLine < selection2.startLine || 
        (selection1.endLine === selection2.startLine && selection1.endCharacter <= selection2.startCharacter)) {
      return false;
    }

    // Selection 2 ends before selection 1 starts
    if (selection2.endLine < selection1.startLine || 
        (selection2.endLine === selection1.startLine && selection2.endCharacter <= selection1.startCharacter)) {
      return false;
    }

    // If we reach here, the selections overlap
    return true;
  }

  /**
   * Adds an active task to tracking
   * @param task The active task to track
   */
  addTask(task: ActiveTask): void {
    this.activeTasks.set(task.id, task);
  }

  /**
   * Removes a task from tracking
   * @param taskId The ID of the task to remove
   */
  removeTask(taskId: string): void {
    this.activeTasks.delete(taskId);
  }

  /**
   * Gets all active tasks
   * @returns Array of all active tasks
   */
  getActiveTasks(): ActiveTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Finds tasks that overlap with the given selection
   * @param selection The selection to check for overlaps
   * @returns Array of overlapping active tasks
   */
  getOverlappingTasks(selection: TextSelection): ActiveTask[] {
    return this.getActiveTasks().filter(task => 
      this.isOverlapping(task.selection, selection)
    );
  }

  /**
   * Checks if a selection has any overlapping active tasks
   * @param selection The selection to check
   * @returns true if there are overlapping tasks, false otherwise
   */
  hasOverlappingTasks(selection: TextSelection): boolean {
    return this.getOverlappingTasks(selection).length > 0;
  }

  /**
   * Clears all active tasks
   */
  clear(): void {
    this.activeTasks.clear();
  }
}