# VCode - Macro Playground for VS Code

VCode is a focused VS Code extension for macro automation: load, manage, and run JavaScript macros directly in your editor.

## Highlights

- Macro Playground for rapid experimentation
- File-based macros from `.vscode/macro`
- Quick execution on selection or whole document
- Built-in commands to add, edit, delete, and refresh macros

## Quick Start

1. Create a macro file in `.vscode/macro/uppercase.js`.
2. Paste this content:

```javascript
module.exports = (context) => {
  return context.input.toUpperCase();
};
```

3. Open Command Palette and run `VCode: Execute Macro`.
4. Pick `uppercase` and see the selection change.

## Commands

- `VCode: Execute Macro`
- `VCode: Add Macro`
- `VCode: Edit Macro`
- `VCode: Delete Macro`
- `VCode: Refresh Macros`
- `VCode: Open Macro Playground`

## Extension Settings

You can configure VCode settings in your `.vscode/settings.json` or User Settings.

```json
{
  "vcode.macro.directories": [
    ".vscode/macro"
  ]
}
```

## Writing Macros

Macros are written in JavaScript and should export a single function. The function receives a `context` object and should return a string.

**Context Object:**

- `input`: Selected text, or the entire document if nothing is selected.
- `languageId`: VS Code language ID (example: `typescript`).
- `filePath`: Absolute path of the active file.

## Macro Playground

Open **Macro Playground** from the Command Palette to run code quickly, save new macros, and load existing ones without leaving the editor.

## Privacy

VCode runs macros locally inside the VS Code extension host and does not send code or content to external services.

## Release Notes

See `CHANGELOG.md` for details.

## License

MIT
