import { createSignal, Show } from "solid-js"
import { useRenderer } from "@opentui/solid"

export type DialogMode = 'save' | 'open' | 'import' | 'export'

export interface DialogAction {
  mode: DialogMode
  run: (path: string) => void | Promise<void>
}

const CFG: Record<DialogMode, { title: string; label: string; btn: string; defaultPath: string }> = {
  save:   { title: 'Save',   label: 'Path:', btn: 'Save',   defaultPath: '/tmp/drawing.json' },
  open:   { title: 'Open',   label: 'Path:', btn: 'Open',   defaultPath: '/tmp/drawing.json' },
  import: { title: 'Import', label: 'File:',  btn: 'Import', defaultPath: '/tmp/import.txt' },
  export: { title: 'Export', label: 'File:',  btn: 'Export', defaultPath: '/tmp/export.txt' },
}

export default function Dialog(props: { action: DialogAction; onClose: () => void }) {
  const r = useRenderer()
  const c = CFG[props.action.mode]
  const [path, setPath] = createSignal(c.defaultPath)
  const [err, setErr] = createSignal('')

  async function confirm() {
    setErr('')
    try {
      await props.action.run(path())
      props.onClose()
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  return (
    <box
      position="absolute"
      left={Math.floor((r.terminalWidth - 48) / 2)}
      top={Math.floor((r.terminalHeight - 7) / 2)}
      width={48} height={7}
      borderStyle="rounded" borderColor="#58a6ff" backgroundColor="#161b22"
      title={c.title} titleColor="#58a6ff" titleAlignment="center"
      paddingX={1} paddingY={1}
      zIndex={10000}
    >
      <box flexDirection="column" gap={1} width="100%">
        <text fg="#8b949e">{c.label}</text>
        <box flexDirection="row" alignItems="center">
          <text fg="#484f58">#</text>
          <input value={path()} onInput={(v: string) => setPath(v)} width={42} backgroundColor="#0d1117" />
        </box>
        <Show when={err()}>
          <text fg="#f85149">{err()}</text>
        </Show>
        <box flexDirection="row" gap={1} justifyContent="flex-end">
          <box paddingX={1} backgroundColor="#1f6feb" onMouseDown={confirm}>
            <text fg="#ffffff">{c.btn}</text>
          </box>
          <box paddingX={1} onMouseDown={props.onClose}>
            <text fg="#8b949e">Cancel</text>
          </box>
        </box>
      </box>
    </box>
  )
}
