import { Show } from "solid-js"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { state, performUndo, performRedo, setState } from "../store"
import { type DialogMode } from "./Dialog"

export default function Toolbar(props: { onDialog: (mode: DialogMode) => void }) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'z') { performUndo(); return }
    if (key.ctrl && key.name === 'y') { performRedo(); return }
    if (key.ctrl && key.name === 'n') { newCanvas(); return }
    if (key.ctrl && key.name === 's') { props.onDialog('save'); return }
    if (key.ctrl && key.name === 'o') { props.onDialog('open'); return }
  })

  function newCanvas() {
    setState('objects', [])
    setState('selectedId', null)
    setState('undoStack', [])
    setState('redoStack', [])
  }

  function handle(action: string) {
    if (action === 'new') newCanvas()
    else if (action === 'open') props.onDialog('open')
    else if (action === 'save') props.onDialog('save')
    else if (action === 'import') props.onDialog('import')
    else if (action === 'export') props.onDialog('export')
    else if (action === 'undo') performUndo()
    else if (action === 'redo') performRedo()
    else if (action === 'quit') renderer.destroy()
  }

  return (
    <box width="100%" height={1} flexDirection="row" alignItems="center" paddingLeft={1} paddingRight={1} gap={1} backgroundColor="#161b22">
      <text fg="#f85149" attributes={1}>tuidraw</text>
      <text fg="#30363d">|</text>
      <Btn label="New" action="new" onClick={handle} />
      <Btn label="Open" action="open" onClick={handle} />
      <Btn label="Save" action="save" onClick={handle} />
      <Btn label="Import" action="import" onClick={handle} />
      <Btn label="Export" action="export" onClick={handle} />
      <box flexGrow={1} />
      <Btn label={'\u2190'} action="undo" onClick={handle} />
      <Btn label={'\u2192'} action="redo" onClick={handle} />
      <text fg="#30363d">|</text>
      <Btn label="Quit" action="quit" onClick={handle} />
    </box>
  )
}

function Btn(props: { label: string; action: string; onClick: (a: string) => void }) {
  return (
    <box paddingX={0.5} onMouseDown={() => props.onClick(props.action)}>
      <text fg="#8b949e">{props.label}</text>
    </box>
  )
}
