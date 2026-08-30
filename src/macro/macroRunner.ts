import * as vscode from 'vscode';
import { Macro, MacroRuntime } from './types';
import { MacroExecutor } from './MacroExecutor';

/**
 * Resolve the runtime of a macro, falling back to its file extension
 */
export function resolveRuntime(macro: Macro): MacroRuntime {
    if (macro.runtime) {
        return macro.runtime;
    }

    const lowerPath = (macro.filePath ?? macro.fileName ?? '').toLowerCase();
    if (lowerPath.endsWith('.py')) {
        return 'python';
    }
    if (lowerPath.endsWith('.pl')) {
        return 'perl';
    }

    return 'javascript';
}

/**
 * Run a macro against the active editor, prompting for any extra parameters,
 * and replace the selection (or the whole document) with the result.
 */
export async function runMacroInActiveEditor(macro: Macro, macroExecutor: MacroExecutor): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    // Get input text (selection or entire document)
    const document = editor.document;
    const selection = editor.selection;
    const input = selection.isEmpty ? document.getText() : document.getText(selection);

    // Extract parameters from macro code (automatically skips 'input' and 'context')
    const runtime = resolveRuntime(macro);
    const paramNames = runtime === 'javascript' ? macroExecutor.extractParameters(macro.code) : [];
    const paramValues: any[] = [];

    // Prompt for each additional parameter (input and context are auto-provided)
    for (let i = 0; i < paramNames.length; i++) {
        const paramName = paramNames[i];
        const value = await vscode.window.showInputBox({
            prompt: `Parameter ${i + 1} of ${paramNames.length}: "${paramName}"`,
            placeHolder: `Enter value for ${paramName}`,
            title: `Macro: ${macro.name}`
        });

        if (value === undefined) {
            // User cancelled
            return;
        }

        paramValues.push(value);
    }

    // Execute macro
    const result = await macroExecutor.execute(macro, {
        input,
        languageId: document.languageId,
        filePath: document.uri.fsPath
    }, paramValues);

    if (!result.success) {
        vscode.window.showErrorMessage(`Macro execution failed: ${result.error}`);
        return;
    }

    // Replace text with output
    await editor.edit(editBuilder => {
        if (selection.isEmpty) {
            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new vscode.Range(firstLine.range.start, lastLine.range.end);
            editBuilder.replace(range, result.output!);
        } else {
            editBuilder.replace(selection, result.output!);
        }
    });

    vscode.window.showInformationMessage(`Macro "${macro.name}" executed successfully`);
}
