import { createSignal, Show } from "solid-js"
import { useRenderer, useKeyboard } from "@opentui/solid"
import Toolbar from "./components/Toolbar"
import ToolSidebar from "./components/ToolSidebar"
import ColorPalette from "./components/ColorPalette"
import Canvas from "./components/Canvas"
import Dialog, { type DialogMode, type DialogAction } from "./components/Dialog"
import { CV } from "./canvas_state"
import { composite } from "./compositor"
import { state, setState, clearCells, requestRender, addObject, performUndo, performRedo } from "./store"
import { hitTest } from "./hit_test"
import { performFill, pickColorAt } from "./tools"

const VISIBLE_TOOLS = ['select','pencil','line','rect','text','eraser','eyedropper'] as const

export default function App() {
  const renderer = useRenderer()
  const [action, setAction] = createSignal<DialogAction | null>(null)

  function showDialog(mode: DialogMode) {
    const handlers: Record<DialogMode, (path: string) => void | Promise<void>> = {
      save: async (p: string) => { await Bun.write(p, JSON.stringify({ version: 1, canvasW: CV.w, canvasH: CV.h, objects: state.objects }, null, 2)) },
      open: async (p: string) => { const d = JSON.parse(await Bun.file(p).text()); if (d?.objects) { setState('objects', d.objects); setState('selectedId', null) } },
      import: async (p: string) => {
        const rows = (await Bun.file(p).text()).split('\n').filter((l: string) => l.length > 0).map((r: string) => r.replace(/\r$/, ''))
        setState('objects', [...state.objects, { id: 'img_' + Date.now(), type: 'image' as const, pos: { x: 0, y: 0 }, fg: '#ffffff', bg: '#000000', data: { rows } }])
      },
      export: async (p: string) => {
        clearCells(); composite(state.objects, CV.cells, CV.w, CV.h)
        const lines: string[] = []
        for (let y = 0; y < CV.h; y++) { let r = ''; for (let x = 0; x < CV.w; x++) r += CV.cells[y][x].char; lines.push(r.replace(/\s+$/, '')) }
        await Bun.write(p, lines.join('\n'))
      },
    }
    setAction({ mode, run: handlers[mode] })
  }

  function handleCursorClick(cx: number, cy: number) {
    const tw = renderer.terminalWidth, th = renderer.terminalHeight
    if (cx < 0 || cx >= tw || cy < 0 || cy >= th) return

    // Toolbar row
    if (cy === 0) {
      const btn: Record<number, () => void> = {
        12: () => showDialog('save'), 17: () => showDialog('open'), 23: () => showDialog('save'),
        29: () => showDialog('import'), 37: () => showDialog('export'),
        67: () => performUndo(), 70: () => performRedo(), 75: () => renderer.destroy(),
      }
      for (const [x, fn] of Object.entries(btn)) {
        if (cx >= parseInt(x) - 3 && cx <= parseInt(x) + 3) { fn(); return }
      }
      return
    }

    // Sidebar
    if (cx < 9) {
      const idx = cy - 1
      if (idx >= 0 && idx < VISIBLE_TOOLS.length) { setState('currentTool', VISIBLE_TOOLS[idx]); return }
      return
    }

    // Canvas
    const rx = cx - 9, ry = cy - 1
    if (rx < 0 || ry < 0 || rx >= CV.w || ry >= CV.h) return

    const tool = state.currentTool
    if (tool === 'fill') {
      const r = performFill(state.objects, CV.cells, rx, ry, CV.w, CV.h, '*', state.currentFg, state.currentBg)
      if (r) addObject(r); return
    }
    if (tool === 'eyedropper') {
      const p = pickColorAt(CV.cells, rx, ry, state.objects, CV.w, CV.h)
      if (p) { setState('currentFg', p.fg); setState('currentBg', p.bg) }; return
    }
    if (tool === 'eraser') {
      const h = hitTest(rx, ry, state.objects)
      if (h) {
        const idx = state.objects.findIndex(o => o.id === h.id)
        if (idx >= 0) { setState('objects', state.objects.toSpliced(idx, 1)); setState('selectedId', null); requestRender() }
      }; return
    }
    if (tool === 'select') {
      const h = hitTest(rx, ry, state.objects)
      setState('selectedId', h ? h.id : null)
      requestRender(); return
    }
    if (tool === 'pencil') {
      CV.cells[ry][rx] = { char: '*', fg: state.currentFg, bg: state.currentBg }
      return
    }
  }

  useKeyboard((key) => {
    const isArrow = ['up','down','left','right'].includes(key.name)
    if (!isArrow || key.eventType === 'release') return

    // Move cursor
    const p = { x: state.cursorX, y: state.cursorY }
    if (key.name === 'up') p.y = Math.max(0, p.y - 1)
    else if (key.name === 'down') p.y = Math.min(renderer.terminalHeight - 1, p.y + 1)
    else if (key.name === 'left') p.x = Math.max(0, p.x - 1)
    else if (key.name === 'right') p.x = Math.min(renderer.terminalWidth - 1, p.x + 1)
    setState({ cursorX: p.x, cursorY: p.y })
    setState('keyCursor', true)

    // Alt+arrow → also click (paint mode)
    if (key.alt) handleCursorClick(state.cursorX, state.cursorY)
  })

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor="#0d1117">
      <Toolbar onDialog={showDialog} />
      <box flexDirection="row" flexGrow={1} width="100%">
        <ToolSidebar />
        <Canvas />
      </box>
      <ColorPalette />
      <Show when={action()}>
        <Dialog action={action()!} onClose={() => setAction(null)} />
      </Show>
      <Show when={state.keyCursor}>
        <box position="absolute" left={state.cursorX} top={state.cursorY} width={1} height={1} zIndex={99999}>
          <text fg="#ffffff" bg="#1f6feb"> </text>
        </box>
      </Show>
    </box>
  )
}
