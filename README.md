# VCode - Macro Playground for VS Code

VCode is a focused VS Code extension for macro automation: load, manage, and run macros directly in your editor.

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
  ],
  "vcode.macro.globals": {
    "author": "Ada Lovelace",
    "apiBase": "https://example.com"
  },
  "vcode.macro.python.path": "/path/to/venv/bin/python3",
  "vcode.macro.perl.path": "/usr/bin/perl"
}
```

## Writing Macros

Macros can be written in **JavaScript**, **Python**, or **Perl**. JavaScript/Python macros return a string; Perl macros write the result to stdout.

**Context Object:**

- `input`: Selected text, or the entire document if nothing is selected.
- `languageId`: VS Code language ID (example: `typescript`).
- `filePath`: Absolute path of the active file.
- `globals`: Global variables from `vcode.macro.globals`.

### JavaScript Macros

JavaScript macros should define a `transform` function.

```javascript
function transform(input, context) {
  return input.toUpperCase();
}
```

### Python Macros

Python macros are `.py` files in `.vscode/macro` and must define `transform(input, context, *args)`.

```python
def transform(input, context, *args):
    return input.upper()
```

Python macros run with the configured interpreter. Set `vcode.macro.python.path` if you need a specific virtualenv or interpreter. If unset, VCode uses the Python extension's default interpreter or falls back to `python3`.

### Perl Macros

Perl macros are `.pl` files in `.vscode/macro` and should be standalone programs. VCode sends the selected text to **stdin** and reads the transformed output from **stdout**.
Set `vcode.macro.perl.path` if you need a specific Perl interpreter.

Environment variables:
- `VCODE_LANGUAGE_ID`
- `VCODE_FILE_PATH`
- `VCODE_GLOBALS_JSON`
- `VCODE_CONTEXT_JSON`
- `VCODE_PARAMS_JSON`
Note: `VCODE_CONTEXT_JSON` includes metadata (languageId, filePath, globals). The input text is provided via stdin.

```perl
#!/usr/bin/env perl
use strict;
use warnings;

local $/;
my $input = <STDIN> // q{};
print $input;
```

## Macro Playground

Open **Macro Playground** from the Command Palette to run code quickly, save new macros, and load existing ones without leaving the editor. You can choose the runtime (JavaScript, Python, or Perl) before running or saving.

## Privacy

VCode runs macros locally inside the VS Code extension host and does not send code or content to external services.

## Release Notes

See `CHANGELOG.md` for details.

## License

MIT
