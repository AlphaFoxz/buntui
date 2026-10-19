export const DEFAULT_UNDO_LIMIT = 100;

export class UndoRedoStack<T> {
  readonly #undoStack: T[] = [];
  readonly #redoStack: T[] = [];
  readonly #limit: number;

  constructor(limit: number = DEFAULT_UNDO_LIMIT) {
    this.#limit = limit;
  }

  pushUndo(current: T): void {
    if (this.#undoStack.length >= this.#limit) {
      this.#undoStack.shift();
    }

    this.#undoStack.push(current);
    this.#redoStack.length = 0;
  }

  undo(current: T): T | undefined {
    const snapshot = this.#undoStack.pop();
    if (snapshot === undefined) {
      return undefined;
    }

    this.#redoStack.push(current);
    return snapshot;
  }

  redo(current: T): T | undefined {
    const snapshot = this.#redoStack.pop();
    if (snapshot === undefined) {
      return undefined;
    }

    this.#undoStack.push(current);
    return snapshot;
  }
}
