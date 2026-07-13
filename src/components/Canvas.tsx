import { onMount, onCleanup } from "solid-js"
import { useRenderer, useKeyboard } from "@opentui/solid"
import { FrameBufferRenderable, RGBA, type MouseEvent } from "@opentui/core"
import { state, setState, requestRender, setRenderCallback, addObject, moveObject, commitMoveObject } from "../store"
import { CV } from "../canvas_state"
import { hitTest } from "../hit_test"
import { newPencil, extendPencil, newLine, newRect, newText, performFill, pickColorAt } from "../tools"
import { bresenhamLine } from "../geo"
import type { DrawObject, PencilData, Vec2 } from "../types"
import { RECT_BORDER_CHARS } from "../types"

function local(e: MouseEvent, fb: FrameBufferRenderable): Vec2 {
  return {
    x: Math.floor(e.x - fb.screenX),
    y: Math.floor(e.y - fb.screenY),
  }
}

const RC = new Map<string, RGBA>()
function rgba(hex: string): RGBA {
  let c = RC.get(hex)
  if (!c) { c = RGBA.fromHex(hex); RC.set(hex, c) }
  return c
}

function lineChar(ax: number, ay: number, bx: number, by: number): string {
  if (ay === by) return '\u2500'
  if (ax === bx) return '\u2502'
  return '*'
}

function drawFullLine(buf: any, x0: number, y0: number, x1: number, y1: number, fg: string) {
  const ch = lineChar(x0, y0, x1, y1)
  const fgc = rgba(fg)
  const pts = bresenhamLine(x0, y0, x1, y1)
  for (const p of pts) {
    if (p.x >= 0 && p.x < CV.w && p.y >= 0 && p.y < CV.h)
      buf.setCell(p.x, p.y, ch, fgc, rgba('#0d1117'))
  }
}

const RP = { tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' }

function drawRectPreview(buf: any, x0: number, y0: number, x1: number, y1: number, fg: string) {
  const ax = Math.min(x0, x1), ay = Math.min(y0, y1)
  const bx = Math.max(x0, x1), by = Math.max(y0, y1)
  const c = rgba(fg)
  const bg = rgba('#0d1117')
  const ib = (x: number, y: number) => x >= 0 && x < CV.w && y >= 0 && y < CV.h
  if (ib(ax, ay)) buf.setCell(ax, ay, RP.tl, c, bg)
  if (ib(bx, ay)) buf.setCell(bx, ay, RP.tr, c, bg)
  if (ib(ax, by)) buf.setCell(ax, by, RP.bl, c, bg)
  if (ib(bx, by)) buf.setCell(bx, by, RP.br, c, bg)
  for (let i = ax + 1; i < bx; i++) {
    if (ib(i, ay)) buf.setCell(i, ay, RP.h, c, bg)
    if (ib(i, by)) buf.setCell(i, by, RP.h, c, bg)
  }
  for (let i = ay + 1; i < by; i++) {
    if (ib(ax, i)) buf.setCell(ax, i, RP.v, c, bg)
    if (ib(bx, i)) buf.setCell(bx, i, RP.v, c, bg)
  }
}

// Inline stamp (same logic as store.ts) + direct buffer write for drag optimization
function storeStamp(cells: Cell[][], obj: DrawObject, w: number, h: number) {
  const ib = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h
  const { pos, fg, bg } = obj
  if (obj.type === 'pencil') {
    const d = obj.data as PencilData
    for (let ry = 0; ry < d.h; ry++) for (let rx = 0; rx < d.w; rx++) {
      const ch = d.cells[ry][rx]
      if (ch !== '\0') { const tx = pos.x + rx, ty = pos.y + ry; if (ib(tx, ty)) cells[ty][tx] = { char: ch, fg, bg } }
    }
  } else if (obj.type === 'line') {
    const d = obj.data as { end: Vec2 }
    let lc: string
    if (pos.y === d.end.y) lc = '\u2500'
    else if (pos.x === d.end.x) lc = '\u2502'
    else lc = '*'
    for (const p of bresenhamLine(pos.x, pos.y, d.end.x, d.end.y))
      if (ib(p.x, p.y)) cells[p.y][p.x] = { char: lc, fg, bg: cells[p.y][p.x].bg }
  } else if (obj.type === 'rect') {
    const d = obj.data as { w: number; h: number; style: string }
    const ch = RECT_BORDER_CHARS[d.style as keyof typeof RECT_BORDER_CHARS] || RECT_BORDER_CHARS.single
    const x0 = pos.x, y0 = pos.y, x1 = pos.x + d.w - 1, y1 = pos.y + d.h - 1
    if (ib(x0, y0)) cells[y0][x0] = { char: ch.tl, fg, bg: cells[y0][x0].bg }
    if (ib(x1, y0)) cells[y0][x1] = { char: ch.tr, fg, bg: cells[y0][x1].bg }
    if (ib(x0, y1)) cells[y1][x0] = { char: ch.bl, fg, bg: cells[y1][x0].bg }
    if (ib(x1, y1)) cells[y1][x1] = { char: ch.br, fg, bg: cells[y1][x1].bg }
    for (let i = 1; i < d.w - 1; i++) {
      if (ib(x0 + i, y0)) cells[y0][x0 + i] = { char: ch.h, fg, bg: cells[y0][x0 + i].bg }
      if (ib(x0 + i, y1)) cells[y1][x0 + i] = { char: ch.h, fg, bg: cells[y1][x0 + i].bg }
    }
    for (let i = 1; i < d.h - 1; i++) {
      if (ib(x0, y0 + i)) cells[y0 + i][x0] = { char: ch.v, fg, bg: cells[y0 + i][x0].bg }
      if (ib(x1, y0 + i)) cells[y0 + i][x1] = { char: ch.v, fg, bg: cells[y0 + i][x1].bg }
    }
  } else if (obj.type === 'text') {
    const d = obj.data as { text: string }
    for (let i = 0; i < d.text.length; i++) { const tx = pos.x + i, ty = pos.y; if (ib(tx, ty)) cells[ty][tx] = { char: d.text[i], fg, bg } }
  } else if (obj.type === 'image') {
    const d = obj.data as { rows: string[] }
    for (let r = 0; r < d.rows.length; r++) for (let i = 0; i < d.rows[r].length; i++) {
      const tx = pos.x + i, ty = pos.y + r; if (ib(tx, ty)) cells[ty][tx] = { char: d.rows[r][i], fg, bg: cells[ty][tx].bg }
    }
  }
}

function renderCellsDirect(buf: any) {
  for (let y = 0; y < CV.h; y++)
    for (let x = 0; x < CV.w; x++) {
      const cell = CV.cells[y][x]
      buf.setCell(x, y, cell.char, rgba(cell.fg), rgba(cell.bg))
    }
  if (state.selectedId) {
    const obj = state.objects.find(o => o.id === state.selectedId)
    if (obj) drawSelection(buf, obj)
  }
}

class CanvasFrameBuffer extends FrameBufferRenderable {
  activePencil: DrawObject | null = null
  drawStart: Vec2 | null = null
  isDrawing = false
  isDragging = false
  dragStart: Vec2 = { x: 0, y: 0 }
  dragOffset: Vec2 = { x: 0, y: 0 }
  prevW = CV.w
  prevH = CV.h

  /** called after cells are written to ensure FB matches CV dimensions */
  syncSize() {
    if (CV.w !== this.prevW || CV.h !== this.prevH) {
      this.frameBuffer.resize(CV.w, CV.h)
      this.width = CV.w
      this.height = CV.h
      this.prevW = CV.w
      this.prevH = CV.h
      // Update scrollbox slider directly, bypassing the clamp ordering issue
      const content = this.parent
      if (content) {
        content.height = CV.h
        let p = content.parent
        while (p) {
          const sb = (p as any)?.verticalScrollBar
          const sl = sb?.slider
          const vp = (p as any)?.viewport?.height ?? 1
          if (sb && sl) {
            // Update slider internals directly to avoid clamp ordering bug
            sb.scrollSize = CV.h
            sb._viewportSize = vp
            sl._viewPortSize = vp
            break
          }
          p = p.parent
        }
      }
    }
  }

  /** text entry state */
  textBuf = ''
  textPos: Vec2 | null = null

  protected onMouseEvent(e: MouseEvent): void {
    if (e.propagationStopped) return
    const { x, y } = local(e, this)
    if (x < 0 || y < 0 || x >= CV.w || y >= CV.h) return
    setState('mousePos', { x, y })

    switch (e.type) {
      case 'down': {
        const mod = e.modifiers
        const isObjDrag = e.button === 2 || mod?.ctrl || mod?.alt

        if (state.currentTool === 'select') {
          const hit = hitTest(x, y, state.objects)
          if (hit) {
            setState('selectedId', hit.id)
            this.dragStart = { x: hit.pos.x, y: hit.pos.y }
            this.dragOffset = { x: x - hit.pos.x, y: y - hit.pos.y }
            this.isDragging = true
            requestRender()
          } else {
            setState('selectedId', null)
            requestRender()
          }
          return
        }
        // Other tools: right-click/ctrl drag always works
        if (isObjDrag) {
          const hit = hitTest(x, y, state.objects)
          if (hit) {
            setState('selectedId', hit.id)
            this.dragStart = { x: hit.pos.x, y: hit.pos.y }
            this.dragOffset = { x: x - hit.pos.x, y: y - hit.pos.y }
            this.isDragging = true
            return
          }
        }

        if (state.currentTool === 'fill') {
          const r = performFill(state.objects, CV.cells, x, y, CV.w, CV.h, '*', state.currentFg, state.currentBg)
          if (r) addObject(r); return
        }
        if (state.currentTool === 'eyedropper') {
          const p = pickColorAt(CV.cells, x, y, state.objects, CV.w, CV.h)
          if (p) { setState('currentFg', p.fg); setState('currentBg', p.bg) }; return
        }
        if (state.currentTool === 'eraser') {
          const h = hitTest(x, y, state.objects)
          if (h) {
            const idx = state.objects.findIndex(o => o.id === h.id)
            if (idx >= 0) { setState('objects', state.objects.toSpliced(idx, 1)); setState('selectedId', null); requestRender() }
          }; return
        }
        if (state.currentTool === 'text') {
          this.textPos = { x, y }
          this.textBuf = ''
          return
        }

        this.isDrawing = true
        this.drawStart = { x, y }
        if (state.currentTool === 'pencil') {
          this.activePencil = newPencil({ x, y }, '*', state.currentFg, state.currentBg)
          addObject(this.activePencil)
        }
        break
      }

      case 'drag': {
        if (this.isDragging && state.selectedId) {
          const np = { x: x - this.dragOffset.x, y: y - this.dragOffset.y }
          np.x = Math.max(0, Math.min(CV.w - 1, np.x))
          np.y = Math.max(0, Math.min(CV.h - 1, np.y))
          moveObject(state.selectedId, np)
          // Interval timer picks up the change and syncs cells→FB
          e.stopPropagation()
          return
        }
        if (this.isDrawing && state.currentTool === 'pencil' && this.activePencil) {
          extendPencil(this.activePencil, x, y, '*')
          if (x >= 0 && x < CV.w && y >= 0 && y < CV.h)
            CV.cells[y][x] = { char: '*', fg: state.currentFg, bg: state.currentBg }
          return
        }
        if (this.isDrawing && (state.currentTool === 'line' || state.currentTool === 'rect')) {
          requestRender()
        }
        break
      }

      case 'up':
      case 'drag-end': {
        if (this.isDragging && state.selectedId) {
          this.isDragging = false
          const from = { ...this.dragStart }
          const to = { x: x - this.dragOffset.x, y: y - this.dragOffset.y }
          const moved = from.x !== to.x || from.y !== to.y
          if (moved) {
            moveObject(state.selectedId, to)
            commitMoveObject(state.selectedId, from, to)
            requestRender()
          }
          return
        }
        if (!this.isDrawing || !this.drawStart) return
        this.isDrawing = false

        if (state.currentTool === 'line') {
          addObject(newLine(this.drawStart, { x, y }, state.currentFg))
        } else if (state.currentTool === 'rect') {
          const w = Math.abs(x - this.drawStart.x) + 1
          const h = Math.abs(y - this.drawStart.y) + 1
          if (w >= 2 && h >= 2) addObject(newRect({ x: Math.min(this.drawStart.x, x), y: Math.min(this.drawStart.y, y) }, w, h, 'single'))
        }
        this.activePencil = null
        this.drawStart = null
        requestRender()
        break
      }

      case 'move':
        break
    }
  }
}

export default function Canvas() {
  const renderer = useRenderer()
  let fbCache: CanvasFrameBuffer | null = null

  useKeyboard((key) => {
    const fb = fbCache

    // Text mode: route to text buffer
    if (fb && fb.textPos) {
      if (key.name === 'return') {
        if (fb.textBuf) {
          addObject(newText(fb.textPos, fb.textBuf, state.currentFg, state.currentBg))
          requestRender()
        }
        fb.textBuf = ''; fb.textPos = null
      } else if (key.name === 'escape') {
        fb.textBuf = ''; fb.textPos = null
      } else if (key.name === 'backspace') {
        fb.textBuf = fb.textBuf.slice(0, -1)
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        fb.textBuf += key.sequence
      }
      if (fb.textPos) requestRender()
    }
  })

  function renderCells() {
    let fb = fbCache
    if (!fb) { fb = renderer.root.findDescendantById("canvas-fb") as CanvasFrameBuffer; fbCache = fb }
    if (!fb) return
    const buf = fb.frameBuffer

    // resize buffer if canvas expanded
    fb.syncSize()

    for (let y = 0; y < CV.h; y++)
      for (let x = 0; x < CV.w; x++) {
        const cell = CV.cells[y][x]
        buf.setCell(x, y, cell.char, rgba(cell.fg), rgba(cell.bg))
      }

    if (fb.isDrawing && fb.drawStart && state.mousePos) {
      const mx = state.mousePos.x, my = state.mousePos.y
      if (state.currentTool === 'line') {
        drawFullLine(buf, fb.drawStart.x, fb.drawStart.y, mx, my, state.currentFg)
      } else if (state.currentTool === 'rect') {
        drawRectPreview(buf, fb.drawStart.x, fb.drawStart.y, mx, my, state.currentFg)
      }
    }

    if (fb.textPos && fb.textBuf) {
      const fgc = rgba(state.currentFg)
      for (let i = 0; i < fb.textBuf.length; i++) {
        const tx = fb.textPos.x + i
        if (tx < CV.w) buf.setCell(tx, fb.textPos.y, fb.textBuf[i], fgc, rgba('#0d1117'))
      }
    }

    if (state.selectedId) {
      const obj = state.objects.find(o => o.id === state.selectedId)
      if (obj) drawSelection(buf, obj)
    }

    fb.requestRender()
  }

  function drawSelection(buf: any, obj: DrawObject) {
    // Swap fg ↔ bg for each cell of the selected object
    const ib = (x: number, y: number) => x >= 0 && x < CV.w && y >= 0 && y < CV.h
    const sw = (x: number, y: number, ch: string, fg: string, bg: string) => {
      if (ib(x, y)) buf.setCell(x, y, ch, rgba(bg), rgba(fg))
    }
    switch (obj.type) {
      case 'line': {
        const d = obj.data as { end: Vec2 }
        const pts = bresenhamLine(obj.pos.x, obj.pos.y, d.end.x, d.end.y)
        let lc: string
        if (obj.pos.y === d.end.y) lc = '\u2500'
        else if (obj.pos.x === d.end.x) lc = '\u2502'
        else lc = '*'
        for (const p of pts) sw(p.x, p.y, lc, obj.fg, obj.bg)
        break
      }
      case 'rect': {
        const d = obj.data as { w: number; h: number; style: string }
        const ch = RECT_BORDER_CHARS[d.style as keyof typeof RECT_BORDER_CHARS] || RECT_BORDER_CHARS.single
        const x0 = obj.pos.x, y0 = obj.pos.y, x1 = x0 + d.w - 1, y1 = y0 + d.h - 1
        sw(x0, y0, ch.tl, obj.fg, obj.bg); sw(x1, y0, ch.tr, obj.fg, obj.bg)
        sw(x0, y1, ch.bl, obj.fg, obj.bg); sw(x1, y1, ch.br, obj.fg, obj.bg)
        for (let i = 1; i < d.w - 1; i++) {
          sw(x0 + i, y0, ch.h, obj.fg, obj.bg); sw(x0 + i, y1, ch.h, obj.fg, obj.bg)
        }
        for (let i = 1; i < d.h - 1; i++) {
          sw(x0, y0 + i, ch.v, obj.fg, obj.bg); sw(x1, y0 + i, ch.v, obj.fg, obj.bg)
        }
        break
      }
      case 'text': {
        const d = obj.data as { text: string }
        for (let i = 0; i < d.text.length; i++)
          sw(obj.pos.x + i, obj.pos.y, d.text[i], obj.fg, obj.bg)
        break
      }
      case 'pencil': {
        const d = obj.data as PencilData
        for (let ry = 0; ry < d.h; ry++)
          for (let rx = 0; rx < d.w; rx++) {
            const ch = d.cells[ry][rx]
            if (ch !== '\0') sw(obj.pos.x + rx, obj.pos.y + ry, ch, obj.fg, obj.bg)
          }
        break
      }
      case 'image': {
        const d = obj.data as { rows: string[] }
        for (let r = 0; r < d.rows.length; r++)
          for (let i = 0; i < d.rows[r].length; i++)
            sw(obj.pos.x + i, obj.pos.y + r, d.rows[r][i], obj.fg, obj.bg)
        break
      }
    }
  }

  let renderTimer: ReturnType<typeof setInterval> | null = null
  let blinkTimer: ReturnType<typeof setInterval> | null = null

  function simulateClick(x: number, y: number) {
    const fb = fbCache
    if (!fb) return
    const tool = state.currentTool
    if (tool === 'select') {
      const hit = hitTest(x, y, state.objects)
      if (hit) { setState('selectedId', hit.id); moveObject(hit.id, hit.pos) } else setState('selectedId', null)
      return
    }
    if (tool === 'eraser') {
      const hit = hitTest(x, y, state.objects)
      if (hit) {
        const idx = state.objects.findIndex(o => o.id === hit.id)
        if (idx >= 0) { setState('objects', state.objects.toSpliced(idx, 1)); setState('selectedId', null); requestRender() }
      }
      return
    }
    if (tool === 'eyedropper') {
      const p = pickColorAt(CV.cells, x, y, state.objects, CV.w, CV.h)
      if (p) { setState('currentFg', p.fg); setState('currentBg', p.bg) }
      return
    }
    if (tool === 'fill') {
      const r = performFill(state.objects, CV.cells, x, y, CV.w, CV.h, '*', state.currentFg, state.currentBg)
      if (r) addObject(r)
      return
    }
    if (tool === 'text') {
      fb.textPos = { x, y }; fb.textBuf = ''
      return
    }
    if (tool === 'line' || tool === 'rect') {
      if (fb.isDrawing && fb.drawStart) {
        if (tool === 'line') addObject(newLine(fb.drawStart, { x, y }, state.currentFg))
        else {
          const w = Math.abs(x - fb.drawStart.x) + 1
          const h = Math.abs(y - fb.drawStart.y) + 1
          if (w >= 2 && h >= 2) addObject(newRect({ x: Math.min(fb.drawStart.x, x), y: Math.min(fb.drawStart.y, y) }, w, h, 'single'))
        }
        fb.isDrawing = false; fb.drawStart = null
      } else {
        fb.isDrawing = true; fb.drawStart = { x, y }
      }
      return
    }
    if (tool === 'pencil') {
      CV.cells[y][x] = { char: '*', fg: state.currentFg, bg: state.currentBg }
      const obj = newPencil({ x, y }, '*', state.currentFg, state.currentBg)
      addObject(obj)
      return
    }
  }

  onMount(() => {
    const root = renderer.root
    const scroller = root.findDescendantById("canvas-scroll")
    if (!scroller) return
    const cw = Math.max(40, renderer.terminalWidth - 10)
    const ch = Math.max(6, renderer.terminalHeight - 3)
    CV.init(cw, ch)
    const fb = new CanvasFrameBuffer(renderer, { id: "canvas-fb", width: CV.w, height: CV.h })
    scroller.add(fb)
    setRenderCallback(() => renderCells())
    requestRender()
    renderTimer = setInterval(() => { if (fbCache) renderCells() }, 10)
    blinkTimer = setInterval(() => setState('cursorBlink', !state.cursorBlink), 500)
  })

  onCleanup(() => {
    if (renderTimer) clearInterval(renderTimer)
    if (blinkTimer) clearInterval(blinkTimer)
    setRenderCallback(() => {})
    const fb = renderer.root.findDescendantById("canvas-fb")
    if (fb) fb.destroy()
  })

  return (
    <scrollbox id="canvas-scroll" flexGrow={1} backgroundColor="#010409" />
  )
}
