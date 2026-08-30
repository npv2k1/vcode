import * as vscode from 'vscode';
import * as path from 'path';
import { Macro } from './types';
import { MacroManager } from './MacroManager';
import { MacroExecutor } from './MacroExecutor';
import { BuiltinMacroLibrary } from './BuiltinMacroLibrary';
import { runMacroInActiveEditor } from './macroRunner';

type BuiltinMacroAction = 'run' | 'install' | 'open' | 'copy';

interface BuiltinMacroPick extends vscode.QuickPickItem {
    macro: Macro;
}

/**
 * Commands for the macro library that ships with the extension
 */
export function registerBuiltinMacroCommands(
    context: vscode.ExtensionContext,
    macroManager: MacroManager,
    macroExecutor: MacroExecutor,
    builtinLibrary: BuiltinMacroLibrary
): void {

    // Browse Built-in Macros
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.browseBuiltinMacros', async () => {
            const macro = await pickBuiltinMacro(macroManager, 'Select a built-in macro');
            if (!macro) {
                return;
            }

            const action = await pickAction(macro);
            if (!action) {
                return;
            }

            switch (action) {
                case 'run':
                    await runMacroInActiveEditor(macro, macroExecutor);
                    break;
                case 'install':
                    await installBuiltinMacro(macro);
                    break;
                case 'open':
                    await openBuiltinMacro(macro, builtinLibrary);
                    break;
                case 'copy':
                    await vscode.env.clipboard.writeText(macro.code);
                    vscode.window.showInformationMessage(`Copied "${macro.name}" to the clipboard`);
                    break;
            }
        })
    );

    // Install a built-in macro into the workspace macro folder
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.installBuiltinMacro', async () => {
            const macro = await pickBuiltinMacro(macroManager, 'Select a built-in macro to copy into this workspace');
            if (!macro) {
                return;
            }

            await installBuiltinMacro(macro);
        })
    );

    // Reload the bundled macros
    context.subscriptions.push(
        vscode.commands.registerCommand('vcode.reloadBuiltinMacros', async () => {
            const macros = await builtinLibrary.load();
            vscode.window.showInformationMessage(`Loaded ${macros.length} built-in macros`);
        })
    );
}

async function pickBuiltinMacro(macroManager: MacroManager, placeHolder: string): Promise<Macro | undefined> {
    const macros = macroManager.getBuiltinMacros();

    if (macros.length === 0) {
        const openSettings = 'Open Settings';
        const choice = await vscode.window.showInformationMessage(
            'No built-in macros are loaded. They may be disabled via "vcode.macro.builtins.enabled".',
            openSettings
        );
        if (choice === openSettings) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'vcode.macro.builtins');
        }
        return undefined;
    }

    const items: (BuiltinMacroPick | vscode.QuickPickItem)[] = [];
    let currentCategory: string | undefined;

    for (const macro of [...macros].sort(compareByCategoryThenName)) {
        const category = macro.category || 'General';
        if (category !== currentCategory) {
            currentCategory = category;
            items.push({ label: category, kind: vscode.QuickPickItemKind.Separator });
        }

        items.push({
            label: macro.name,
            description: macro.description,
            detail: macro.fileName,
            macro
        });
    }

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder,
        matchOnDescription: true,
        matchOnDetail: true
    });

    return selected && 'macro' in selected ? selected.macro : undefined;
}

async function pickAction(macro: Macro): Promise<BuiltinMacroAction | undefined> {
    const selected = await vscode.window.showQuickPick<vscode.QuickPickItem & { action: BuiltinMacroAction }>(
        [
            {
                label: '$(play) Run on selection',
                description: 'Apply the macro to the current selection or document',
                action: 'run'
            },
            {
                label: '$(save-as) Copy to workspace',
                description: 'Save an editable copy in the workspace macro folder',
                action: 'install'
            },
            {
                label: '$(go-to-file) Open source',
                description: 'Open the bundled macro script',
                action: 'open'
            },
            {
                label: '$(clippy) Copy code to clipboard',
                action: 'copy'
            }
        ],
        { placeHolder: `Built-in macro: ${macro.name}` }
    );

    return selected?.action;
}

/**
 * Copy a bundled macro into the workspace so it can be edited and versioned
 */
async function installBuiltinMacro(macro: Macro): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Open a workspace folder before copying a built-in macro');
        return;
    }

    const config = vscode.workspace.getConfiguration('vcode');
    const directories = config.get<string[]>('macro.directories') || [];
    const targetDir = directories.find(dir => !path.isAbsolute(dir)) ?? directories[0] ?? '.vscode/macro';
    const targetDirUri = path.isAbsolute(targetDir)
        ? vscode.Uri.file(targetDir)
        : vscode.Uri.joinPath(workspaceFolder.uri, ...targetDir.split(/[\\/]/).filter(Boolean));

    const fileName = macro.fileName ?? `${macro.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.js`;
    const targetUri = vscode.Uri.joinPath(targetDirUri, fileName);

    try {
        await vscode.workspace.fs.createDirectory(targetDirUri);

        if (await exists(targetUri)) {
            const overwrite = await vscode.window.showWarningMessage(
                `${fileName} already exists in ${targetDir}. Overwrite it?`,
                'Overwrite',
                'Cancel'
            );

            if (overwrite !== 'Overwrite') {
                return;
            }
        }

        await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(macro.code));

        const document = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage(`Copied "${macro.name}" to ${targetDir}/${fileName}`);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to copy built-in macro: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

async function openBuiltinMacro(macro: Macro, builtinLibrary: BuiltinMacroLibrary): Promise<void> {
    const uri = macro.fileName
        ? vscode.Uri.joinPath(builtinLibrary.getLibraryUri(), macro.fileName)
        : macro.filePath
            ? vscode.Uri.file(macro.filePath)
            : undefined;

    if (!uri) {
        vscode.window.showErrorMessage(`Could not locate the source of "${macro.name}"`);
        return;
    }

    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: true });
}

async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

function compareByCategoryThenName(a: Macro, b: Macro): number {
    const categoryA = a.category || 'General';
    const categoryB = b.category || 'General';

    if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
    }

    return a.name.localeCompare(b.name);
}
