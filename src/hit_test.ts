import type { DrawObject, PencilData, RectData, LineData, TextData, ImageData, RectStyle } from "./types"
import { distanceToSegment } from "./geo"

export function hitTest(x: number, y: number, objects: DrawObject[]): DrawObject | null {
//  console.log(1)
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i]
    if (pointInObject(x, y, obj)) {console.log(1);return obj}
  }
  return null
}

function pointInObject(px: number, py: number, obj: DrawObject): boolean {
  switch (obj.type) {
    case 'line': {
      const d = obj.data as LineData
      return distanceToSegment(px, py, obj.pos.x, obj.pos.y, d.end.x, d.end.y) < 0.6
    }
    case 'rect': {
      const d = obj.data as RectData
      const x0 = obj.pos.x, y0 = obj.pos.y
      const x1 = x0 + d.w - 1, y1 = y0 + d.h - 1
      if (px < x0 || px > x1 || py < y0 || py > y1) return false
      if (px === x0 || px === x1 || py === y0 || py === y1) return true
      return false
    }
    case 'text': {
      const d = obj.data as TextData
      return py === obj.pos.y && px >= obj.pos.x && px < obj.pos.x + d.text.length
    }
    case 'pencil': {
      const d = obj.data as PencilData
      const rx = px - obj.pos.x
      const ry = py - obj.pos.y
      return rx >= 0 && ry >= 0 && rx < d.w && ry < d.h && d.cells[ry][rx] !== '\0'
    }
    case 'image': {
      const d = obj.data as ImageData
      const maxRowLen = Math.max(...d.rows.map(r => r.length), 0)
      return px >= obj.pos.x && px < obj.pos.x + maxRowLen &&
             py >= obj.pos.y && py < obj.pos.y + d.rows.length
    }
  }
  return false
}
