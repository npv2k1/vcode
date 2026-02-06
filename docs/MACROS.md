# VCode Macro Guide

Macros in VCode allow you to automate complex text transformations using JavaScript. This guide covers how to write, save, and use macros effectively.

## Macro Structure

A macro is essentially a JavaScript function that takes a `context` object as input and returns a string (the transformed code) or nothing (if it performs side effects, though returning the transformed string is standard for text replacement).

### Basic Syntax

```javascript
module.exports = async (context) => {
    // Your logic here
    const input = context.input;
    
    // ... transformation ...
    
    return transformedOutput;
}
```

### The `context` Object

The `context` object passed to your macro contains the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `input` | `string` | The currently selected text in the editor. If no text is selected, it contains the entire document content. |
| `languageId` | `string` | The language ID of the active document (e.g., `typescript`, `python`, `json`). |
| `filePath` | `string` | The absolute file path of the active document. |

## Examples

### 1. Convert to JSON String
Takes the selected text and wraps it as a JSON string.

```javascript
module.exports = (context) => {
    try {
        // Assume input is a raw string or object to be stringified
        // If it's code, we might want to just quote it
        return JSON.stringify(context.input);
    } catch (e) {
        return context.input;
    }
}
```

### 2. Wrap in Try-Catch
Wraps the selected code in a `try-catch` block.

```javascript
module.exports = (context) => {
    const code = context.input;
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
module.exports = (context) => {
    // Use path module if available or simple string manipulation
    const fileName = context.filePath ? context.filePath.split(/[\\/]/).pop() : 'unknown';
    
    return `console.log('[${fileName}] ${context.input}', ${context.input});`;
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
VCode automatically loads `.js` files from the `.vscode/macro` directory in your workspace.
1. Create a folder `.vscode/macro`.
2. Create a file, e.g., `my-macro.js`.
3. Export your function using `module.exports`.
4. Run `VCode: Refresh Macros` to load it.

The file name will be used as the macro name.

## Best Practices
- **Error Handling:** Wrap your macro logic in `try-catch` blocks to prevent breaking the extension if the macro fails.
- **Idempotency:** Try to make macros safe to run multiple times (e.g., check if code is already wrapped before wrapping again).
- **Async:** Macros can be `async` functions if you need to perform asynchronous operations (though simple text transformation usually doesn't require it).