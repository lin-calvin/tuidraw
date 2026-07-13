import { For } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { state, setState, deleteSelected } from "../store"
import { TOOLS, type Tool } from "../types"

const HIDDEN_TOOLS: Tool[] = ['fill']

export default function ToolSidebar() {
  useKeyboard((key) => {
    const num = parseInt(key.name)
    if (num >= 1 && num <= TOOLS.length) setState('currentTool', TOOLS[num - 1])
    if (key.name === 'delete' || key.name === 'backspace') deleteSelected()
  })

  return (
    <box width={9} height="100%" flexDirection="column" backgroundColor="#0d1117" border={['right']} borderColor="#21262d">
      <For each={TOOLS.filter(t => !HIDDEN_TOOLS.includes(t))}>{(tool: Tool) => <ToolButton tool={tool} selected={state.currentTool === tool} />}</For>
      <box flexGrow={1} />
    </box>
  )
}

function ToolButton(props: { tool: Tool; selected: boolean }) {
  const toolLabels: Record<string, string> = {
    select: '\u25CB',
    pencil: '\u270E',
    line: '\u2500\u2500',
    rect: '\u25A1',
    text: 'T',
    eraser: '\u2717',
    fill: '\u25A0',
    eyedropper: '\u25CB',
  }
  const toolNames: Record<string, string> = {
    select: 'Sel', pencil: 'Pen', line: 'Line', rect: 'Rect', text: 'Text',
    eraser: 'Del', fill: 'Fill', eyedropper: 'Color',
  }

  return (
    <box
      height={1}
      paddingLeft={1}
      backgroundColor={props.selected ? '#1f6feb' : 'transparent'}
      onMouseDown={() => setState('currentTool', props.tool)}
    >
      <text fg={props.selected ? '#ffffff' : '#8b949e'}>
        {toolLabels[props.tool]} {toolNames[props.tool]}
      </text>
    </box>
  )
}
