import { RECT_BORDER_CHARS, type RectStyle, type Vec2 } from "./types"

export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  const points: Vec2[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    points.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }

  return points
}

export function rectBorder(x: number, y: number, w: number, h: number, style: RectStyle): Vec2[] {
  const points: Vec2[] = []
  const ch = RECT_BORDER_CHARS[style]

  for (let i = 1; i < w - 1; i++) {
    points.push({ x: x + i, y })
    points.push({ x: x + i, y: y + h - 1 })
  }
  for (let i = 1; i < h - 1; i++) {
    points.push({ x, y: y + i })
    points.push({ x: x + w - 1, y: y + i })
  }

  return points
}

export function rectCorners(x: number, y: number, w: number, h: number, style: RectStyle): { pos: Vec2; char: string }[] {
  const ch = RECT_BORDER_CHARS[style]
  return [
    { pos: { x, y }, char: ch.tl },
    { pos: { x: x + w - 1, y }, char: ch.tr },
    { pos: { x, y: y + h - 1 }, char: ch.bl },
    { pos: { x: x + w - 1, y: y + h - 1 }, char: ch.br },
  ]
}

export function rectAll(x: number, y: number, w: number, h: number, style: RectStyle): { pos: Vec2; char: string }[] {
  const result: { pos: Vec2; char: string }[] = []
  const ch = RECT_BORDER_CHARS[style]

  result.push({ pos: { x, y }, char: ch.tl })
  result.push({ pos: { x: x + w - 1, y }, char: ch.tr })
  result.push({ pos: { x, y: y + h - 1 }, char: ch.bl })
  result.push({ pos: { x: x + w - 1, y: y + h - 1 }, char: ch.br })

  for (let i = 1; i < w - 1; i++) {
    result.push({ pos: { x: x + i, y }, char: ch.h })
    result.push({ pos: { x: x + i, y: y + h - 1 }, char: ch.h })
  }
  for (let i = 1; i < h - 1; i++) {
    result.push({ pos: { x, y: y + i }, char: ch.v })
    result.push({ pos: { x: x + w - 1, y: y + i }, char: ch.v })
  }

  return result
}

export function floodFill(
  grid: string[][],
  startX: number,
  startY: number,
  w: number,
  h: number,
): Vec2[] {
  const target = grid[startY][startX]
  if (target === ' ' || target === '\0') return []

  const visited = new Set<number>()
  const result: Vec2[] = []
  const stack: Vec2[] = [{ x: startX, y: startY }]

  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    const key = y * w + x
    if (visited.has(key)) continue
    if (x < 0 || x >= w || y < 0 || y >= h) continue
    if (grid[y][x] !== target) continue

    visited.add(key)
    result.push({ x, y })
    grid[y][x] = ' '

    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  return result
}

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 === 0) return Math.hypot(px - ax, py - ay)
  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  return Math.hypot(px - cx, py - cy)
}
