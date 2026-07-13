import type { Cell, DrawObject, PencilData, RectData, LineData, TextData, ImageData, RectStyle } from "./types"
import { RECT_BORDER_CHARS } from "./types"
import { bresenhamLine } from "./geo"

export function composite(objects: DrawObject[], cells: Cell[][], w: number, h: number) {
  const bg = '#1a1a2e'
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      cells[y][x] = { char: ' ', fg: '#ffffff', bg }

  for (const obj of objects) {
    stamp(cells, obj, w, h)
  }
}

function stamp(cells: Cell[][], obj: DrawObject, w: number, h: number) {
  const { pos, fg, bg } = obj

  switch (obj.type) {
    case 'pencil':
      stampPencil(cells, pos.x, pos.y, fg, bg, obj.data as PencilData, w, h)
      break
    case 'line':
      stampLine(cells, pos.x, pos.y, fg, obj.data as LineData, w, h)
      break
    case 'rect':
      stampRect(cells, pos.x, pos.y, obj.data as RectData, w, h)
      break
    case 'text':
      stampText(cells, pos.x, pos.y, fg, bg, obj.data as TextData, w, h)
      break
    case 'image':
      stampImage(cells, pos.x, pos.y, obj.data as ImageData, w, h)
      break
  }
}

function inBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && x < w && y >= 0 && y < h
}

function stampPencil(cells: Cell[][], ox: number, oy: number, fg: string, bg: string, data: PencilData, w: number, h: number) {
  for (let ry = 0; ry < data.h; ry++)
    for (let rx = 0; rx < data.w; rx++) {
      const ch = data.cells[ry][rx]
      if (ch !== '\0') {
        const tx = ox + rx, ty = oy + ry
        if (inBounds(tx, ty, w, h)) cells[ty][tx] = { char: ch, fg, bg }
      }
    }
}

function stampLine(cells: Cell[][], ox: number, oy: number, fg: string, data: LineData, w: number, h: number) {
  let lc: string
  if (oy === data.end.y) lc = '\u2500'
  else if (ox === data.end.x) lc = '\u2502'
  else lc = '*'
  const points = bresenhamLine(ox, oy, data.end.x, data.end.y)
  for (const p of points) {
    if (inBounds(p.x, p.y, w, h)) {
      cells[p.y][p.x] = { char: lc, fg, bg: cells[p.y][p.x].bg }
    }
  }
}

function stampRect(cells: Cell[][], ox: number, oy: number, data: RectData, w: number, h: number) {
  const style = data.style as RectStyle
  const ch = RECT_BORDER_CHARS[style]

  const x0 = ox, y0 = oy, x1 = ox + data.w - 1, y1 = oy + data.h - 1

  if (inBounds(x0, y0, w, h)) cells[y0][x0] = { char: ch.tl, fg: '#ffffff', bg: cells[y0][x0].bg }
  if (inBounds(x1, y0, w, h)) cells[y0][x1] = { char: ch.tr, fg: '#ffffff', bg: cells[y0][x1].bg }
  if (inBounds(x0, y1, w, h)) cells[y1][x0] = { char: ch.bl, fg: '#ffffff', bg: cells[y1][x0].bg }
  if (inBounds(x1, y1, w, h)) cells[y1][x1] = { char: ch.br, fg: '#ffffff', bg: cells[y1][x1].bg }

  for (let i = 1; i < data.w - 1; i++) {
    if (inBounds(x0 + i, y0, w, h)) cells[y0][x0 + i] = { char: ch.h, fg: '#ffffff', bg: cells[y0][x0 + i].bg }
    if (inBounds(x0 + i, y1, w, h)) cells[y1][x0 + i] = { char: ch.h, fg: '#ffffff', bg: cells[y1][x0 + i].bg }
  }
  for (let i = 1; i < data.h - 1; i++) {
    if (inBounds(x0, y0 + i, w, h)) cells[y0 + i][x0] = { char: ch.v, fg: '#ffffff', bg: cells[y0 + i][x0].bg }
    if (inBounds(x1, y0 + i, w, h)) cells[y0 + i][x1] = { char: ch.v, fg: '#ffffff', bg: cells[y0 + i][x1].bg }
  }
}

function stampText(cells: Cell[][], ox: number, oy: number, fg: string, bg: string, data: TextData, w: number, h: number) {
  for (let i = 0; i < data.text.length; i++) {
    const tx = ox + i
    const ty = oy
    if (inBounds(tx, ty, w, h)) {
      cells[ty][tx] = { char: data.text[i], fg, bg }
    }
  }
}

function stampImage(cells: Cell[][], ox: number, oy: number, data: ImageData, w: number, h: number) {
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.rows[r].length; c++) {
      const tx = ox + c
      const ty = oy + r
      if (inBounds(tx, ty, w, h)) {
        cells[ty][tx] = { char: data.rows[r][c], fg: '#ffffff', bg: cells[ty][tx].bg }
      }
    }
  }
}
