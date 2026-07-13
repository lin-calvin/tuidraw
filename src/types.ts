export interface Vec2 {
  x: number
  y: number
}

export type Tool = 'select' | 'pencil' | 'line' | 'rect' | 'text' | 'eraser' | 'fill' | 'eyedropper'

export type RectStyle = 'single' | 'double' | 'rounded'

export interface PencilData {
  w: number
  h: number
  cells: string[][]  // cells[ry][rx] = char, '\0' = empty
}

export interface LineData {
  end: Vec2
}

export interface RectData {
  w: number
  h: number
  style: RectStyle
}

export interface TextData {
  text: string
}

export interface ImageData {
  rows: string[]
}

export type DrawObjectData = PencilData | LineData | RectData | TextData | ImageData

export interface DrawObject {
  id: string
  type: Tool | 'image'
  pos: Vec2
  fg: string
  bg: string
  data: DrawObjectData
}

export interface Cell {
  char: string
  fg: string
  bg: string
}

export interface ToolState {
  active: boolean
  startPos?: Vec2
  endPos?: Vec2
  cells?: { rx: number; ry: number; char: string }[]
}

export type UndoAction =
  | { type: 'create'; object: DrawObject }
  | { type: 'delete'; object: DrawObject; index: number }
  | { type: 'move'; objectId: string; from: Vec2; to: Vec2 }
  | { type: 'modify'; objectId: string; oldData: DrawObjectData; newData: DrawObjectData }
  | { type: 'reorder'; objectId: string; fromIndex: number; toIndex: number }
  | { type: 'batch'; actions: UndoAction[] }

export const CANVAS_W = 120
export const CANVAS_H = 80

export const TOOLS: Tool[] = ['select', 'pencil', 'line', 'rect', 'text', 'eraser', 'fill', 'eyedropper']

export const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select',
  pencil: 'Pencil',
  line: 'Line',
  rect: 'Rect',
  text: 'Text',
  eraser: 'Eraser',
  fill: 'Fill',
  eyedropper: 'Eyedropper',
}

export const TOOL_CHARS: Record<Tool, string> = {
  select: '\u25CB',
  pencil: '\u270E',
  line: '\u2500\u2500',
  rect: '\u25A1',
  text: 'T',
  eraser: '\u2717',
  fill: '\u25A0',
  eyedropper: '\u25CB',
}

export const RECT_STYLES: RectStyle[] = ['single', 'double', 'rounded']

export const RECT_BORDER_CHARS: Record<RectStyle, { tl: string; tr: string; bl: string; br: string; h: string; v: string }> = {
  single: { tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
  double: { tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D', h: '\u2550', v: '\u2551' },
  rounded: { tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F', h: '\u2500', v: '\u2502' },
}

export const ANSI_COLORS: { name: string; hex: string }[] = [
  { name: 'black', hex: '#000000' },
  { name: 'red', hex: '#AA0000' },
  { name: 'green', hex: '#00AA00' },
  { name: 'yellow', hex: '#AA5500' },
  { name: 'blue', hex: '#0000AA' },
  { name: 'magenta', hex: '#AA00AA' },
  { name: 'cyan', hex: '#00AAAA' },
  { name: 'white', hex: '#AAAAAA' },
  { name: 'bright black', hex: '#555555' },
  { name: 'bright red', hex: '#FF5555' },
  { name: 'bright green', hex: '#55FF55' },
  { name: 'bright yellow', hex: '#FFFF55' },
  { name: 'bright blue', hex: '#5555FF' },
  { name: 'bright magenta', hex: '#FF55FF' },
  { name: 'bright cyan', hex: '#55FFFF' },
  { name: 'bright white', hex: '#FFFFFF' },
]
