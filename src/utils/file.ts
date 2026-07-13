import type { DrawObject, Cell, ImageData } from "../types"
import { CANVAS_W, CANVAS_H } from "../types"
import { composite } from "../compositor"
import { newImage } from "../tools"

export function exportTxt(objects: DrawObject[]): string {
  const cells: Cell[][] = Array.from({ length: CANVAS_H }, () =>
    Array.from({ length: CANVAS_W }, () => ({ char: ' ', fg: '#ffffff', bg: '#000000' })),
  )
  composite(objects, cells, CANVAS_W, CANVAS_H)
  return cells.map(row => row.map(c => c.char).join('').replace(/\s+$/, '')).join('\n')
}

export function importTxt(text: string): DrawObject {
  const rows = text.split('\n')
  const nonEmpty = rows.filter(r => r.length > 0)
  const trimmed = nonEmpty.map(r => r.replace(/\r$/, ''))
  return newImage({ x: 0, y: 0 }, trimmed)
}

export interface SaveData {
  version: number
  canvasW: number
  canvasH: number
  objects: DrawObject[]
}

export function serializeState(objects: DrawObject[]): string {
  const data: SaveData = {
    version: 1,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    objects,
  }
  return JSON.stringify(data, null, 2)
}

export function deserializeState(json: string): DrawObject[] | null {
  try {
    const data: SaveData = JSON.parse(json)
    if (data.version !== 1) return null
    return data.objects
  } catch {
    return null
  }
}

export async function saveToFile(objects: DrawObject[], filePath: string) {
  const content = serializeState(objects)
  await Bun.write(filePath, content)
}

export async function loadFromFile(filePath: string): Promise<DrawObject[] | null> {
  const content = await Bun.readable(filePath)
  const text = await new Response(content).text()
  return deserializeState(text)
}

export async function exportToTxtFile(objects: DrawObject[], filePath: string) {
  const text = exportTxt(objects)
  await Bun.write(filePath, text)
}

export async function importTxtFile(filePath: string): Promise<DrawObject> {
  const file = Bun.file(filePath)
  const text = await file.text()
  return importTxt(text)
}
