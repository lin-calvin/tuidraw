import type { UndoAction } from "../types"

const MAX_UNDO = 100

export function pushUndo(
  stack: UndoAction[],
  redoStack: UndoAction[],
  action: UndoAction,
): UndoAction[] {
  redoStack.length = 0
  const next = [...stack, action]
  if (next.length > MAX_UNDO) next.shift()
  return next
}

export function undo(
  stack: UndoAction[],
  redoStack: UndoAction[],
): { action: UndoAction | null; newStack: UndoAction[]; newRedo: UndoAction[] } {
  if (stack.length === 0) return { action: null, newStack: stack, newRedo: redoStack }
  const action = stack[stack.length - 1]
  const newStack = stack.slice(0, -1)
  const newRedo = [...redoStack, action]
  return { action, newStack, newRedo }
}

export function redo(
  stack: UndoAction[],
  redoStack: UndoAction[],
): { action: UndoAction | null; newStack: UndoAction[]; newRedo: UndoAction[] } {
  if (redoStack.length === 0) return { action: null, newStack: stack, newRedo: redoStack }
  const action = redoStack[redoStack.length - 1]
  const newRedo = redoStack.slice(0, -1)
  const newStack = [...stack, action]
  return { action, newStack, newRedo }
}

export function invertAction(action: UndoAction): UndoAction | null {
  switch (action.type) {
    case 'create':
      return { type: 'delete', object: action.object, index: -1 }
    case 'delete':
      return { type: 'create', object: action.object }
    case 'move':
      return { type: 'move', objectId: action.objectId, from: action.to, to: action.from }
    case 'modify':
      return { type: 'modify', objectId: action.objectId, oldData: action.newData, newData: action.oldData }
    case 'reorder':
      return { type: 'reorder', objectId: action.objectId, fromIndex: action.toIndex, toIndex: action.fromIndex }
    case 'batch':
      return { type: 'batch', actions: action.actions.map(invertAction).filter(Boolean) as UndoAction[] }
  }
}
