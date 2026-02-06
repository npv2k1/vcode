# VCode Macro Guide

Macros in VCode allow you to automate complex text transformations using JavaScript or Python. This guide covers how to write, save, and use macros effectively.

## Macro Structure

A macro is a function that takes the input text and a `context` object, and returns a string (the transformed code). JavaScript and Python macros follow the same shape.

### Basic Syntax (JavaScript)

```javascript
function transform(input, context) {
    // Your logic here
    const text = input;

    // ... transformation ...

    return text.toUpperCase();
}
```

### Basic Syntax (Python)

```python
def transform(input, context, *args):
    return input.upper()
```

### The `context` Object

The `context` object passed to your macro contains the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `input` | `string` | The currently selected text in the editor. If no text is selected, it contains the entire document content. |
| `languageId` | `string` | The language ID of the active document (e.g., `typescript`, `python`, `json`). |
| `filePath` | `string` | The absolute file path of the active document. |
| `globals` | `object` | Global variables from `vcode.macro.globals` settings. |

### Global Variables

You can define global variables in settings and access them in any macro via `context.globals`.

```json
{
  "vcode.macro.globals": {
    "author": "Ada Lovelace",
    "apiBase": "https://example.com"
  }
}
```

## Examples (JavaScript)

### 1. Convert to JSON String
Takes the selected text and wraps it as a JSON string.

```javascript
function transform(input, context) {
    try {
        // Assume input is a raw string or object to be stringified
        // If it's code, we might want to just quote it
        return JSON.stringify(input);
    } catch (e) {
        return input;
    }
}
```

### 2. Wrap in Try-Catch
Wraps the selected code in a `try-catch` block.

```javascript
function transform(input, context) {
    const code = input;
    const indentation = "    "; // You might want to detect indentation

    // Indent the original code
    const indentedCode = code.split('\n').map(line => indentation + line).join('\n');

    return `try {
${indentedCode}
} catch (error) {
${indentation}console.error(error);
}`;
}
```

### 3. Create Logger
Inserts a console log with the file name.

```javascript
function transform(input, context) {
    // Use path module if available or simple string manipulation
    const fileName = context.filePath ? context.filePath.split(/[\\/]/).pop() : 'unknown';

    return `console.log('[${fileName}] ${input}', ${input});`;
}
```

## Managing Macros

### Creating Macros
1. Open the **Macro Playground** from the VCode activity bar.
2. Click the `+` icon or use the command `VCode: Add Macro`.
3. Give your macro a name and description.
4. Write your code in the playground editor.
5. Save.

### Loading from Files
VCode automatically loads `.js` and `.py` files from the `.vscode/macro` directory in your workspace.
1. Create a folder `.vscode/macro`.
2. Create a file, e.g., `my-macro.js` or `my-macro.py`.
3. Define a `transform` function.
4. Run `VCode: Refresh Macros` to load it.

The file name will be used as the macro name.

### Python Interpreter

Python macros run using the configured interpreter. If you use a virtual environment, set `vcode.macro.python.path` to the interpreter path so your installed libraries are available. If unset, VCode uses the Python extension's default interpreter or falls back to `python3`.

## Best Practices
- **Error Handling:** Wrap your macro logic in `try-catch` blocks to prevent breaking the extension if the macro fails.
- **Idempotency:** Try to make macros safe to run multiple times (e.g., check if code is already wrapped before wrapping again).
- **Async:** Macros can be `async` functions if you need to perform asynchronous operations (though simple text transformation usually doesn't require it).
