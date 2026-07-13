import { For } from "solid-js"
import { state, setState } from "../store"
import { ANSI_COLORS } from "../types"

export default function ColorPalette() {
  return (
    <box width="100%" height={2} flexDirection="row" alignItems="center" paddingLeft={1} gap={1} backgroundColor="#161b22" border={['top']} borderColor="#21262d">
      <SwatchRow label="FG" colors={ANSI_COLORS} current={state.currentFg} onPick={(h) => setState('currentFg', h)} />
      <text fg="#30363d">|</text>
      <SwatchRow label="BG" colors={ANSI_COLORS} current={state.currentBg} onPick={(h) => setState('currentBg', h)} />
      <box flexGrow={1} />
      <text fg="#8b949e">fg </text><text fg={state.currentFg}>{renderColorName(state.currentFg)}</text>
      <text fg="#8b949e"> bg </text><text fg={state.currentBg}>{renderColorName(state.currentBg)}</text>
    </box>
  )
}

function SwatchRow(props: { label: string; colors: { hex: string }[]; current: string; onPick: (h: string) => void }) {
  return (
    <box flexDirection="row" alignItems="center" gap={0}>
      <text fg="#8b949e">{props.label}</text>
      <For each={props.colors}>{(c) => (
        <box onMouseDown={() => props.onPick(c.hex)}>
          <text fg={c.hex}>{c.hex === props.current ? '\u2588' : '\u2591'}</text>
        </box>
      )}</For>
    </box>
  )
}

function renderColorName(hex: string): string {
  for (const c of ANSI_COLORS) if (c.hex === hex) return c.name
  return hex
}
