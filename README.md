# Tuidraw

A terminal-based ASCII drawing tool inspired by Asciiflow and Windows Paint, built with OpenTUI.

## Features

- **Drawing tools**: Pencil, Line, Rectangle, Text
- **Selection & move**: Select tool for picking and dragging objects; right-click / Ctrl+drag also works in any tool
- **Color palette**: 16 ANSI colors for foreground and background, plus a color picker for sampling existing colors
- **Auto-expanding canvas**: Starts at viewport size, grows automatically as you draw near the edges
- **Scrollable**: Large drawings scroll naturally within the terminal
- **Undo / Redo**: Ctrl+Z / Ctrl+Y
- **File operations**: Save and Open native `.tuidraw.json` format; Import and Export plain `.txt`
- **Keyboard shortcuts**: Tool selection via number keys 1–7

## Install

### Prerequisites

- [Bun](https://bun.sh)
- [Zig](https://ziglang.org) (required by OpenTUI to build the native renderer)

### Setup

```bash
git clone https://github.com/your-username/tuidraw
cd tuidraw
bun install
bun index.tsx
```

## Controls

### Tools

| Tool | Key | Usage |
|------|-----|-------|
| Select `○` | 1 | Click to pick an object, then drag to move it |
| Pen `✎` | 2 | Click and drag to draw freehand |
| Line `──` | 3 | Click and drag to draw a straight line |
| Rect `□` | 4 | Click and drag to draw a rectangle outline |
| Text `T` | 5 | Click to place the cursor, type your text, press Enter to confirm |
| Del `✗` | 6 | Click an object to delete it |
| Color `○` | 7 | Click a cell to sample its color |

### Shortcuts

| Keys | Action |
|------|--------|
| `Ctrl+S` | Save to `.tuidraw.json` |
| `Ctrl+O` | Open from `.tuidraw.json` |
| `Ctrl+N` | New canvas |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Delete` / `Backspace` | Delete selected object |
| `Escape` | Cancel text input / Quit |

### File

| Button | Description |
|--------|-------------|
| New | Clear the canvas |
| Open | Open a `.tuidraw.json` file |
| Save | Save as `.tuidraw.json` |
| Import | Import a plain `.txt` file as an image object |
| Export | Export the canvas to plain `.txt` |

## License

GNU General Public License v3.0. See the `LICENSE` file.
