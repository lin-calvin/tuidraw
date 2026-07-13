import type { Cell, DrawObject, PencilData, Vec2 } from "./types"
import { CANVAS_W, CANVAS_H } from "./types"
import { bresenhamLine } from "./geo"

// Mutable canvas state — wrapped in an object so all importers see the same ref
export const CV = {
  w: CANVAS_W,
  h: CANVAS_H,
  cells: null as unknown as Cell[][],

  init(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ char: ' ', fg: '#ffffff', bg: '#0d1117' })),
    )
  },

  clear() {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        this.cells[y][x] = { char: ' ', fg: '#ffffff', bg: '#0d1117' }
  },

  realloc(newW: number, newH: number) {
    const old = this.cells
    const oldW = this.w
    const oldH = this.h
    this.cells = Array.from({ length: newH }, (_, y) =>
      Array.from({ length: newW }, (_, x) =>
        y < oldH && x < oldW ? { ...old[y][x] } : { char: ' ', fg: '#ffffff', bg: '#0d1117' },
      ),
    )
    this.w = newW
    this.h = newH
  },
}

// ---------------------------------------------------------------------------
// Auto-expand: if any object pixel is within MARGIN of the edge, grow by STEP

const MARGIN = 5
const STEP = 20

export function autoExpand(objects: DrawObject[]): boolean {
  let needL = 0, needR = 0, needU = 0, needD = 0
  const w = CV.w, h = CV.h

  for (const obj of objects) expandBounds(obj, (x, y) => {
    if (x < MARGIN) needL = Math.max(needL, MARGIN - x)
    if (x >= w - MARGIN) needR = Math.max(needR, x - (w - MARGIN) + 1)
    if (y < MARGIN) needU = Math.max(needU, MARGIN - y)
    if (y >= h - MARGIN) needD = Math.max(needD, y - (h - MARGIN) + 1)
  })

  if (!needL && !needR && !needU && !needD) return false

  const addL = (needL ? Math.ceil(needL / STEP) * STEP : 0)
  const addR = (needR ? Math.ceil(needR / STEP) * STEP : 0)
  const addU = (needU ? Math.ceil(needU / STEP) * STEP : 0)
  const addD = (needD ? Math.ceil(needD / STEP) * STEP : 0)

  const newW = w + addL + addR
  const newH = h + addU + addD

  const old = CV.cells, oldW = w, oldH = h
  const newCells = Array.from({ length: newH }, (_, y) =>
    Array.from({ length: newW }, (_, x) => {
      const sx = x - addL, sy = y - addU
      return (sx >= 0 && sx < oldW && sy >= 0 && sy < oldH)
        ? { ...old[sy][sx] }
        : { char: ' ', fg: '#ffffff', bg: '#0d1117' }
    }),
  )

  CV.cells = newCells
  CV.w = newW
  CV.h = newH

  // Shift all objects' positions
  for (const obj of objects) {
    obj.pos.x += addL
    obj.pos.y += addU
    if (obj.type === 'line') {
      const d = obj.data as { end: Vec2 }
      d.end.x += addL
      d.end.y += addU
    }
    if (obj.type === 'pencil') {
      // relative cells don't need shifting; only pos is shifted above
    }
    if (obj.type === 'image') {
      // pos already shifted; no per-cell adjustment needed
    }
  }

  return true
}

function expandBounds(obj: DrawObject, touch: (x: number, y: number) => void) {
  const { pos } = obj
  switch (obj.type) {
    case 'line': {
      const d = obj.data as { end: Vec2 }
      const pts = bresenhamLine(pos.x, pos.y, d.end.x, d.end.y)
      for (const p of pts) touch(p.x, p.y)
      break
    }
    case 'rect': {
      const d = obj.data as { w: number; h: number }
      const x0 = pos.x, y0 = pos.y, x1 = pos.x + d.w - 1, y1 = pos.y + d.h - 1
      for (let x = x0; x <= x1; x++) { touch(x, y0); touch(x, y1) }
      for (let y = y0 + 1; y < y1; y++) { touch(x0, y); touch(x1, y) }
      break
    }
    case 'text': {
      const d = obj.data as { text: string }
      for (let i = 0; i < d.text.length; i++) touch(pos.x + i, pos.y)
      break
    }
    case 'pencil': {
      const d = obj.data as PencilData
      for (let ry = 0; ry < d.h; ry++)
        for (let rx = 0; rx < d.w; rx++)
          if (d.cells[ry][rx] !== '\0') touch(pos.x + rx, pos.y + ry)
      break
    }
    case 'image': {
      const d = obj.data as { rows: string[] }
      for (let r = 0; r < d.rows.length; r++)
        for (let i = 0; i < d.rows[r].length; i++)
          touch(pos.x + i, pos.y + r)
      break
    }
  }
}
