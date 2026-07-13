import type { DrawObject, Tool, Vec2, PencilData, RectData, TextData, ImageData, RectStyle } from "./types"
import { bresenhamLine, floodFill } from "./geo"
import { composite } from "./compositor"
import { state, setState } from "./store"

let nextId = 1
function genId(): string {
  return `obj_${nextId++}`
}

export function newPencil(pos: Vec2, char: string, fg: string, bg: string): DrawObject {
  return {
    id: genId(),
    type: 'pencil',
    pos: { ...pos },
    fg,
    bg,
    data: { w: 1, h: 1, cells: [[char]] },
  }
}

export function extendPencil(obj: DrawObject, x: number, y: number, char: string) {
  const data = obj.data as PencilData
  let rx = x - obj.pos.x
  let ry = y - obj.pos.y
  const w = data.w, h = data.h, cells = data.cells
  // If negative, shift internal array AND adjust obj.pos
  if (rx < 0 || ry < 0) {
    const dx = rx < 0 ? -rx : 0
    const dy = ry < 0 ? -ry : 0
    const nw = w + dx, nh = h + dy
    const nc: string[][] = Array.from({ length: nh }, () => Array(nw).fill('\0'))
    for (let y2 = 0; y2 < h; y2++)
      for (let x2 = 0; x2 < w; x2++)
        nc[y2 + dy][x2 + dx] = cells[y2][x2]
    data.w = nw; data.h = nh; data.cells = nc
    obj.pos.x -= dx; obj.pos.y -= dy
    rx += dx; ry += dy
  }
  // Expand right/down if needed
  if (rx >= data.w || ry >= data.h) {
    const nw = Math.max(data.w, rx + 1)
    const nh = Math.max(data.h, ry + 1)
    const nc: string[][] = Array.from({ length: nh }, () => Array(nw).fill('\0'))
    for (let y2 = 0; y2 < data.h; y2++)
      for (let x2 = 0; x2 < data.w; x2++)
        nc[y2][x2] = data.cells[y2][x2]
    data.w = nw; data.h = nh; data.cells = nc
  }
  data.cells[ry][rx] = char
}

export function newLine(start: Vec2, end: Vec2, fg: string): DrawObject {
  return {
    id: genId(),
    type: 'line',
    pos: start,
    fg,
    bg: '#000000',
    data: { end },
  }
}

export function newRect(pos: Vec2, w: number, h: number, style: RectStyle): DrawObject {
  return {
    id: genId(),
    type: 'rect',
    pos,
    fg: '#ffffff',
    bg: '#000000',
    data: { w, h, style },
  }
}

export function newText(pos: Vec2, text: string, fg: string, bg: string): DrawObject {
  return {
    id: genId(),
    type: 'text',
    pos,
    fg,
    bg,
    data: { text },
  }
}

export function newImage(pos: Vec2, rows: string[]): DrawObject {
  return {
    id: genId(),
    type: 'image',
    pos,
    fg: '#ffffff',
    bg: '#000000',
    data: { rows },
  }
}

export function performFill(
  objects: DrawObject[],
  cells: { char: string; fg: string; bg: string }[][],
  fx: number,
  fy: number,
  w: number,
  h: number,
  fillChar: string,
  fillFg: string,
  fillBg: string,
): DrawObject | null {
  const charGrid: string[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => cells[y][x].char),
  )

  const visited = new Set<number>()
  const target = charGrid[fy][fx]
  if (target === ' ') return null

  const fillCells: Vec2[] = []
  const stack: Vec2[] = [{ x: fx, y: fy }]

  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    const key = y * w + x
    if (visited.has(key)) continue
    if (x < 0 || x >= w || y < 0 || y >= h) continue
    if (charGrid[y][x] !== target) continue

    visited.add(key)
    fillCells.push({ x, y })

    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  if (fillCells.length === 0) return null

  return {
    id: genId(),
    type: 'pencil',
    pos: { x: 0, y: 0 },
    fg: fillFg,
    bg: fillBg,
    data: {
      cells: fillCells.map(v => ({ rx: v.x, ry: v.y, char: fillChar })),
    },
  }
}

export function pickColorAt(
  cells: { char: string; fg: string; bg: string }[][],
  x: number,
  y: number,
  objects: DrawObject[],
  cw?: number,
  ch?: number,
): { fg: string; bg: string } | null {
  const w = cw ?? cells[0]?.length ?? 0
  const h = ch ?? cells.length ?? 0
  if (x < 0 || x >= w || y < 0 || y >= h) return null
  const cell = cells[y]?.[x]
  if (!cell || cell.char === ' ') return null
  const obj = findObjectAt(objects, x, y)
  if (obj) return { fg: obj.fg, bg: obj.bg }
  return { fg: cell.fg, bg: cell.bg }
}

function findObjectAt(objects: DrawObject[], x: number, y: number): DrawObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i]
    if (obj.type === 'pencil') {
      const d = obj.data as PencilData
      const rx = x - obj.pos.x, ry = y - obj.pos.y
      if (rx >= 0 && ry >= 0 && rx < d.w && ry < d.h && d.cells[ry][rx] !== '\0') return obj
    }
  }
  return null
}
