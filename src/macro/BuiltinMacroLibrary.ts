import * as vscode from 'vscode';
import * as path from 'path';
import { BuiltinMacroMetadata, Macro, MacroRuntime } from './types';
import { MacroManager } from './MacroManager';

/** Prefix used for the IDs of macros shipped with the extension */
export const BUILTIN_MACRO_ID_PREFIX = 'builtin-';

/** Folder inside the extension that holds the bundled macro scripts */
export const BUILTIN_MACRO_DIR = ['snippets', 'macros'];

const METADATA_SCAN_LINES = 40;
const SUPPORTED_EXTENSIONS: Record<string, MacroRuntime> = {
    '.js': 'javascript',
    '.py': 'python',
    '.pl': 'perl'
};

/**
 * Read `@name`, `@description` and `@category` tags from the header of a macro
 * script. The tags are comment-syntax agnostic so the same parser works for
 * JavaScript, Python and Perl macros.
 */
export function parseBuiltinMacroMetadata(content: string, fallbackName: string): BuiltinMacroMetadata {
    const header = content.split(/\r?\n/).slice(0, METADATA_SCAN_LINES).join('\n');

    const readTag = (tag: string): string | undefined => {
        const match = header.match(new RegExp(`@${tag}[ \\t]+(.+)`));
        return match ? match[1].trim() : undefined;
    };

    return {
        name: readTag('name') || fallbackName,
        description: readTag('description') || `Built-in macro (${fallbackName})`,
        category: readTag('category') || 'General'
    };
}

/**
 * Loads the common macros that ship with the extension so every workspace has a
 * usable macro set without any setup.
 */
export class BuiltinMacroLibrary {
    private readonly libraryUri: vscode.Uri;
    private macros: Macro[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly macroManager: MacroManager
    ) {
        this.libraryUri = vscode.Uri.joinPath(context.extensionUri, ...BUILTIN_MACRO_DIR);

        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('vcode.macro.builtins')) {
                    void this.load();
                }
            })
        );
    }

    /** Location of the bundled macro scripts */
    getLibraryUri(): vscode.Uri {
        return this.libraryUri;
    }

    /** Built-in macros currently registered */
    getMacros(): Macro[] {
        return [...this.macros];
    }

    /** (Re)load the bundled macros into the macro manager */
    async load(): Promise<Macro[]> {
        this.macros = [];
        this.macroManager.clearBuiltinMacros();

        const config = vscode.workspace.getConfiguration('vcode');
        if (config.get<boolean>('macro.builtins.enabled') === false) {
            return [];
        }

        const excluded = (config.get<string[]>('macro.builtins.exclude') || []).map(value =>
            value.trim().toLowerCase()
        );

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(this.libraryUri);
        } catch (error) {
            console.error('Failed to read built-in macro library:', error);
            return [];
        }

        const files = entries
            .filter(([name, type]) => type === vscode.FileType.File && this.getRuntime(name) !== undefined)
            .map(([name]) => name)
            .sort();

        for (const file of files) {
            const macro = await this.loadMacro(file);
            if (!macro) {
                continue;
            }

            const isExcluded =
                excluded.includes(macro.name.toLowerCase()) ||
                excluded.includes(file.toLowerCase()) ||
                excluded.includes(path.basename(file, path.extname(file)).toLowerCase());

            if (isExcluded) {
                continue;
            }

            this.macros.push(macro);
            this.macroManager.registerBuiltinMacro(macro);
        }

        return this.getMacros();
    }

    private async loadMacro(fileName: string): Promise<Macro | undefined> {
        const uri = vscode.Uri.joinPath(this.libraryUri, fileName);
        const runtime = this.getRuntime(fileName);

        if (!runtime) {
            return undefined;
        }

        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            const content = new TextDecoder('utf-8').decode(bytes);
            const baseName = path.basename(fileName, path.extname(fileName));
            const metadata = parseBuiltinMacroMetadata(content, baseName);

            return {
                id: `${BUILTIN_MACRO_ID_PREFIX}${baseName}`,
                name: metadata.name,
                description: metadata.description,
                category: metadata.category,
                code: runtime === 'javascript' ? content.replace(/export\s+function/, 'function') : content,
                createdAt: Date.now(),
                runtime,
                source: 'builtin',
                filePath: uri.fsPath,
                fileName
            };
        } catch (error) {
            console.error(`Failed to load built-in macro ${fileName}:`, error);
            return undefined;
        }
    }

    private getRuntime(fileName: string): MacroRuntime | undefined {
        return SUPPORTED_EXTENSIONS[path.extname(fileName).toLowerCase()];
    }

    dispose(): void {
        this.macros = [];
    }
}
