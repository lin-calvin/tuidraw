import { createSignal, Show, onMount, onCleanup } from "solid-js"
import { Portal, useRenderer, useKeyboard } from "@opentui/solid"
import Toolbar from "./components/Toolbar"
import ToolSidebar from "./components/ToolSidebar"
import ColorPalette from "./components/ColorPalette"
import Canvas from "./components/Canvas"
import Dialog, { type DialogMode, type DialogAction } from "./components/Dialog"
import { CV } from "./canvas_state"
import { composite } from "./compositor"
import { state, setState, clearCells } from "./store"

function emitMouse(renderer: any, x: number, y: number, type: 'down' | 'up') {
  const seq = `\x1b[<0;${x + 1};${y + 1}${type === 'down' ? 'M' : 'm'}`
  renderer.stdin.emit('data', Buffer.from(seq))
}

export default function App() {
  const renderer = useRenderer()
  const [action, setAction] = createSignal<DialogAction | null>(null)
  let blinkTimer: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    blinkTimer = setInterval(() => setState('cursorBlink', !state.cursorBlink), 500)
  })
  onCleanup(() => { if (blinkTimer) clearInterval(blinkTimer) })

  useKeyboard((key) => {
    const isArrow = ['up','down','left','right'].includes(key.name)
    if (key.ctrl && isArrow) {
      setState('keyCursor', true)
      const p = { x: state.cursorX, y: state.cursorY }
      if (key.name === 'up') p.y = Math.max(0, p.y - 1)
      else if (key.name === 'down') p.y = Math.min(renderer.terminalHeight - 1, p.y + 1)
      else if (key.name === 'left') p.x = Math.max(0, p.x - 1)
      else if (key.name === 'right') p.x = Math.min(renderer.terminalWidth - 1, p.x + 1)
      setState({ cursorX: p.x, cursorY: p.y } as any)
      return
    }
    if (key.name === 'space' && state.keyCursor) {
      emitMouse(renderer, state.cursorX, state.cursorY, 'down')
      setTimeout(() => emitMouse(renderer, state.cursorX, state.cursorY, 'up'), 10)
      return
    }
  })

  function onToolbarAction(mode: DialogMode) {
    const handlers: Record<DialogMode, (path: string) => void | Promise<void>> = {
      save: async (path: string) => {
        const data = { version: 1, canvasW: CV.w, canvasH: CV.h, objects: state.objects }
        await Bun.write(path, JSON.stringify(data, null, 2))
      },
      open: async (path: string) => {
        const text = await Bun.file(path).text()
        const data = JSON.parse(text)
        if (data?.objects) { setState('objects', data.objects); setState('selectedId', null) }
      },
      import: async (path: string) => {
        const text = await Bun.file(path).text()
        const rows = text.split('\n').filter((l: string) => l.length > 0).map((r: string) => r.replace(/\r$/, ''))
        setState('objects', [...state.objects, {
          id: 'img_' + Date.now(), type: 'image' as const,
          pos: { x: 0, y: 0 }, fg: '#ffffff', bg: '#000000', data: { rows },
        }])
      },
      export: async (path: string) => {
        clearCells()
        composite(state.objects, CV.cells, CV.w, CV.h)
        const lines: string[] = []
        for (let y = 0; y < CV.h; y++) {
          let row = ''
          for (let x = 0; x < CV.w; x++) row += CV.cells[y][x].char
          lines.push(row.replace(/\s+$/, ''))
        }
        await Bun.write(path, lines.join('\n'))
      },
    }
    setAction({ mode, run: handlers[mode] })
  }

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor="#0d1117">
      <Toolbar onDialog={onToolbarAction} />
      <box flexDirection="row" flexGrow={1} width="100%">
        <ToolSidebar />
        <Canvas />
      </box>
      <ColorPalette />
      <Show when={action()}>
        <Dialog action={action()!} onClose={() => setAction(null)} />
      </Show>
      <Show when={state.keyCursor && state.cursorBlink}>
        <Portal mount={renderer.root}>
          <box position="absolute" left={state.cursorX} top={state.cursorY} width={1} height={1} zIndex={99999}>
            <text fg="#ffffff" bg="#1f6feb"> </text>
          </box>
        </Portal>
      </Show>
    </box>
  )
}
