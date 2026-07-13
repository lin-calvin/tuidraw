import { createSignal, Show } from "solid-js"
import { useRenderer } from "@opentui/solid"
import Toolbar from "./components/Toolbar"
import ToolSidebar from "./components/ToolSidebar"
import ColorPalette from "./components/ColorPalette"
import Canvas from "./components/Canvas"
import Dialog, { type DialogMode, type DialogAction } from "./components/Dialog"
import { CV } from "./canvas_state"
import { composite } from "./compositor"
import { state, setState, clearCells } from "./store"

export default function App() {
  const renderer = useRenderer()
  const [action, setAction] = createSignal<DialogAction | null>(null)

  function onToolbarAction(mode: DialogMode) {
    const handlers: Record<DialogMode, (path: string) => void | Promise<void>> = {
      save: async (path: string) => {
        const data = { version: 1, canvasW: CV.w, canvasH: CV.h, objects: state.objects }
        await Bun.write(path, JSON.stringify(data, null, 2))
      },
      open: async (path: string) => {
        const text = await Bun.file(path).text()
        const data = JSON.parse(text)
        if (data?.objects) {
          setState('objects', data.objects)
          setState('selectedId', null)
        }
      },
      import: async (path: string) => {
        const text = await Bun.file(path).text()
        const rows = text.split('\n').filter((l: string) => l.length > 0).map((r: string) => r.replace(/\r$/, ''))
        setState('objects', [...state.objects, {
          id: 'img_' + Date.now(), type: 'image' as const,
          pos: { x: 0, y: 0 }, fg: '#ffffff', bg: '#000000',
          data: { rows },
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
        const text = lines.join('\n')
        await Bun.write(path, text)
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
    </box>
  )
}
