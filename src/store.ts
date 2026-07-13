import { createStore } from "solid-js/store"
import { pushUndo, undo, redo, invertAction } from "./utils/undo"
import type { Cell, DrawObject, PencilData, Tool, ToolState, UndoAction, Vec2 } from "./types"
import { CV, autoExpand } from "./canvas_state"
import { bresenhamLine } from "./geo"
import { RECT_BORDER_CHARS } from "./types"

let renderCallback: (() => void) | null = null

export const [state, setState] = createStore({
  objects: [] as DrawObject[],
  currentTool: 'pencil' as Tool,
  currentFg: '#ffffff' as string,
  currentBg: '#0d1117' as string,
  selectedId: null as string | null,
  undoStack: [] as UndoAction[],
  redoStack: [] as UndoAction[],
  toolState: { active: false } as ToolState,
  gridVisible: true,
  mousePos: { x: 0, y: 0 } as Vec2,
  keyCursor: false,
  cursorBlink: false,
  cursorX: 10,
  cursorY: 10,
})

export function setRenderCallback(cb: () => void) {
  renderCallback = cb
}

export function clearCells() {
  CV.clear()
}

export function requestRender() {
  CV.clear()
  for (const obj of state.objects) stamp(obj)
  if (autoExpand(state.objects)) {
    CV.clear()
    for (const obj of state.objects) stamp(obj)
  }
  renderCallback?.()
}

function ib(x: number, y: number) { return x >= 0 && x < CV.w && y >= 0 && y < CV.h }

function stamp(obj: DrawObject) {
  const c = CV.cells
  const { pos, fg, bg } = obj

  switch (obj.type) {
    case 'pencil': {
      const d = obj.data as PencilData
      for (let ry = 0; ry < d.h; ry++)
        for (let rx = 0; rx < d.w; rx++) {
          const ch = d.cells[ry][rx]
          if (ch !== '\0') {
            const tx = pos.x + rx, ty = pos.y + ry
            if (ib(tx, ty)) c[ty][tx] = { char: ch, fg, bg }
          }
        }
      break
    }
    case 'line': {
      const d = obj.data as { end: Vec2 }
      let lc: string
      if (pos.y === d.end.y) lc = '\u2500'
      else if (pos.x === d.end.x) lc = '\u2502'
      else lc = '*'
      const pts = bresenhamLine(pos.x, pos.y, d.end.x, d.end.y)
      for (const p of pts) {
        if (ib(p.x, p.y)) c[p.y][p.x] = { char: lc, fg, bg: c[p.y][p.x].bg }
      }
      break
    }
    case 'rect': {
      const d = obj.data as { w: number; h: number; style: string }
      const ch = RECT_BORDER_CHARS[d.style as keyof typeof RECT_BORDER_CHARS] || RECT_BORDER_CHARS.single
      const x0 = pos.x, y0 = pos.y, x1 = pos.x + d.w - 1, y1 = pos.y + d.h - 1
      if (ib(x0, y0)) c[y0][x0] = { char: ch.tl, fg, bg: c[y0][x0].bg }
      if (ib(x1, y0)) c[y0][x1] = { char: ch.tr, fg, bg: c[y0][x1].bg }
      if (ib(x0, y1)) c[y1][x0] = { char: ch.bl, fg, bg: c[y1][x0].bg }
      if (ib(x1, y1)) c[y1][x1] = { char: ch.br, fg, bg: c[y1][x1].bg }
      for (let i = 1; i < d.w - 1; i++) {
        if (ib(x0 + i, y0)) c[y0][x0 + i] = { char: ch.h, fg, bg: c[y0][x0 + i].bg }
        if (ib(x0 + i, y1)) c[y1][x0 + i] = { char: ch.h, fg, bg: c[y1][x0 + i].bg }
      }
      for (let i = 1; i < d.h - 1; i++) {
        if (ib(x0, y0 + i)) c[y0 + i][x0] = { char: ch.v, fg, bg: c[y0 + i][x0].bg }
        if (ib(x1, y0 + i)) c[y0 + i][x1] = { char: ch.v, fg, bg: c[y0 + i][x1].bg }
      }
      break
    }
    case 'text': {
      const d = obj.data as { text: string }
      for (let i = 0; i < d.text.length; i++) {
        const tx = pos.x + i, ty = pos.y
        if (ib(tx, ty)) c[ty][tx] = { char: d.text[i], fg, bg }
      }
      break
    }
    case 'image': {
      const d = obj.data as { rows: string[] }
      for (let r = 0; r < d.rows.length; r++)
        for (let i = 0; i < d.rows[r].length; i++) {
          const tx = pos.x + i, ty = pos.y + r
          if (ib(tx, ty)) c[ty][tx] = { char: d.rows[r][i], fg, bg: c[ty][tx].bg }
        }
      break
    }
  }
}

export function addObject(obj: DrawObject) {
  setState('objects', [...state.objects, obj])
  pushUndoAction({ type: 'create', object: obj })
  requestRender()
}

export function pushUndoAction(action: UndoAction) {
  setState('undoStack', pushUndo(state.undoStack, state.redoStack, action))
}

export function performUndo() {
  const result = undo(state.undoStack, state.redoStack)
  if (!result.action) return
  const inv = invertAction(result.action)
  if (!inv) return
  setState({ undoStack: result.newStack, redoStack: result.newRedo })
  applyAction(inv)
  requestRender()
}

export function performRedo() {
  const result = redo(state.undoStack, state.redoStack)
  if (!result.action) return
  setState({ undoStack: result.newStack, redoStack: result.newRedo })
  applyAction(result.action)
  requestRender()
}

function applyAction(action: UndoAction) {
  switch (action.type) {
    case 'create':
      setState('objects', [...state.objects, action.object])
      break
    case 'delete': {
      const idx = action.index >= 0 ? action.index : state.objects.findIndex(o => o.id === action.object.id)
      if (idx >= 0) setState('objects', state.objects.toSpliced(idx, 1))
      break
    }
    case 'move':
      setState('objects', state.objects.map(o => o.id === action.objectId ? { ...o, pos: action.to } : o))
      break
    case 'modify':
      setState('objects', state.objects.map(o => o.id === action.objectId ? { ...o, data: action.newData } : o))
      break
    case 'reorder': {
      const objs = [...state.objects]
      const [item] = objs.splice(action.fromIndex, 1)
      objs.splice(action.toIndex, 0, item)
      setState('objects', objs)
      break
    }
    case 'batch':
      action.actions.forEach(applyAction)
      break
  }
}

export function deleteSelected() {
  if (!state.selectedId) return
  const idx = state.objects.findIndex(o => o.id === state.selectedId)
  if (idx < 0) return
  const obj = state.objects[idx]
  setState('objects', state.objects.toSpliced(idx, 1))
  setState('selectedId', null)
  pushUndoAction({ type: 'delete', object: obj, index: idx })
  requestRender()
}

export function moveObject(id: string, to: Vec2) {
  setState('objects', state.objects.map(o => o.id === id ? { ...o, pos: to } : o))
}

export function commitMoveObject(id: string, from: Vec2, to: Vec2) {
  pushUndoAction({ type: 'move', objectId: id, from, to })
  requestRender()
}

export function bringToFront(id: string) {
  const idx = state.objects.findIndex(o => o.id === id)
  if (idx < 0 || idx >= state.objects.length - 1) return
  const objs = [...state.objects]
  const [item] = objs.splice(idx, 1)
  objs.push(item)
  setState('objects', objs)
  pushUndoAction({ type: 'reorder', objectId: id, fromIndex: idx, toIndex: objs.length - 1 })
  requestRender()
}

export function sendToBack(id: string) {
  const idx = state.objects.findIndex(o => o.id === id)
  if (idx <= 0) return
  const objs = [...state.objects]
  const [item] = objs.splice(idx, 1)
  objs.unshift(item)
  setState('objects', objs)
  pushUndoAction({ type: 'reorder', objectId: id, fromIndex: idx, toIndex: 0 })
  requestRender()
}
