import * as vscode from 'vscode';
import { Macro } from './types';
import { MacroManager } from './MacroManager';
import { MacroExecutor } from './MacroExecutor';
import { runMacroInActiveEditor } from './macroRunner';
import { BuiltinMacroLibrary } from './BuiltinMacroLibrary';

/**
 * Human readable label for where a macro comes from
 */
export function describeMacroSource(macro: Macro): string {
    if (macro.source === 'builtin') {
        return `Built-in${macro.category ? ` · ${macro.category}` : ''}`;
    }
    if (macro.source === 'file' || macro.id.startsWith('file-')) {
        return macro.filePath ? `File · ${macro.filePath}` : 'File';
    }
    return 'User';
}

export function registerMacroCommands(
    context: vscode.ExtensionContext,
    macroManager: MacroManager,
    macroExecutor: MacroExecutor,
    builtinLibrary?: BuiltinMacroLibrary
): void {

    // Execute Macro Command
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.executeMacro', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            // Get all macros
            const macros = macroManager.getMacros();
            if (macros.length === 0) {
                vscode.window.showInformationMessage('No macros available. Add a macro first.');
                return;
            }

            // Show quick pick to select macro
            const selected = await vscode.window.showQuickPick(
                macros.map(m => ({
                    label: m.name,
                    description: m.description,
                    detail: describeMacroSource(m),
                    macro: m
                })),
                {
                    placeHolder: 'Select a macro to execute',
                    matchOnDescription: true,
                    matchOnDetail: true
                }
            );

            if (!selected) {
                return;
            }

            await runMacroInActiveEditor(selected.macro, macroExecutor);
        })
    );

    // Add Macro Command
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.addMacro', async () => {
            // Get macro name
            const name = await vscode.window.showInputBox({
                prompt: 'Enter macro name',
                placeHolder: 'My Macro',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Macro name cannot be empty';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            // Get macro description
            const description = await vscode.window.showInputBox({
                prompt: 'Enter macro description',
                placeHolder: 'What does this macro do?',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Description cannot be empty';
                    }
                    return null;
                }
            });

            if (!description) {
                return;
            }

            // Get macro code
            const code = await vscode.window.showInputBox({
                prompt: 'Enter macro function code',
                placeHolder: 'function transform(input) { return input.toUpperCase(); }',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Code cannot be empty';
                    }
                    // Validate syntax
                    const validation = macroExecutor.validateMacroCode(value);
                    if (!validation.valid) {
                        return `Invalid code: ${validation.error}`;
                    }
                    return null;
                }
            });

            if (!code) {
                return;
            }

            try {
                await macroManager.addMacro(name.trim(), description.trim(), code.trim());
                vscode.window.showInformationMessage(`Macro "${name}" added successfully!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add macro: ${error}`);
            }
        })
    );

    // Edit Macro Command
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.editMacro', async () => {
            const macros = macroManager.getMacros().filter(m => m.source !== 'builtin');
            if (macros.length === 0) {
                vscode.window.showInformationMessage('No editable macros available. Built-in macros are read-only.');
                return;
            }

            // Select macro to edit
            const selected = await vscode.window.showQuickPick(
                macros.map(m => ({
                    label: m.name,
                    description: m.description,
                    macro: m
                })),
                {
                    placeHolder: 'Select a macro to edit'
                }
            );

            if (!selected) {
                return;
            }

            const macro = selected.macro;

            // Edit name
            const name = await vscode.window.showInputBox({
                prompt: 'Edit macro name',
                value: macro.name,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Macro name cannot be empty';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            // Edit description
            const description = await vscode.window.showInputBox({
                prompt: 'Edit macro description',
                value: macro.description,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Description cannot be empty';
                    }
                    return null;
                }
            });

            if (!description) {
                return;
            }

            // Edit code
            const code = await vscode.window.showInputBox({
                prompt: 'Edit macro function code',
                value: macro.code,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Code cannot be empty';
                    }
                    const validation = macroExecutor.validateMacroCode(value);
                    if (!validation.valid) {
                        return `Invalid code: ${validation.error}`;
                    }
                    return null;
                }
            });

            if (!code) {
                return;
            }

            try {
                await macroManager.updateMacro(macro.id, {
                    name: name.trim(),
                    description: description.trim(),
                    code: code.trim()
                });
                vscode.window.showInformationMessage(`Macro "${name}" updated successfully!`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to update macro: ${error}`);
            }
        })
    );

    // Delete Macro Command
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.deleteMacro', async () => {
            const macros = macroManager.getMacros().filter(m => m.source !== 'builtin');
            if (macros.length === 0) {
                vscode.window.showInformationMessage('No deletable macros available. Built-in macros are read-only.');
                return;
            }

            // Select macro to delete
            const selected = await vscode.window.showQuickPick(
                macros.map(m => ({
                    label: m.name,
                    description: m.description,
                    macro: m
                })),
                {
                    placeHolder: 'Select a macro to delete'
                }
            );

            if (!selected) {
                return;
            }

            // Confirm deletion
            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${selected.macro.name}"?`,
                'Yes', 'No'
            );

            if (confirmation !== 'Yes') {
                return;
            }

            try {
                await macroManager.deleteMacro(selected.macro.id);
                vscode.window.showInformationMessage(`Macro "${selected.macro.name}" deleted successfully`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete macro: ${error}`);
            }
        })
    );

    // Refresh Macros Command
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.refreshMacros', async () => {
            macroManager.reload();
            const builtins = await builtinLibrary?.load();
            vscode.window.showInformationMessage(
                builtins
                    ? `Macros reloaded (${builtins.length} built-in)`
                    : 'Macros reloaded from settings'
            );
        })
    );
}
