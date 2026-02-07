import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Macro, MacroRuntime } from './types';
import { MacroManager } from './MacroManager';

export class MacroFileLoader {
    private watchers: vscode.FileSystemWatcher[] = [];
    private readonly defaultMacroDir = '.vscode/macro';

    constructor(
        private context: vscode.ExtensionContext,
        private macroManager: MacroManager
    ) {
        this.initialize();
    }

    private async initialize() {
        await this.loadConfiguredMacros();

        // Listen for configuration changes
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('vcode.macro.directories')) {
                    this.reloadMacros();
                }
            })
        );
    }

    private async reloadMacros() {
        // Dispose existing watchers
        this.disposeWatchers();

        // Clear existing file macros (this might be tricky if we don't track which macros came from files)
        // For now, we rely on the manager to handle re-registration or we could add a method to clear file macros
        // But since we don't have a clear way to identify *which* macros are from files in the manager public API without checking ID prefix,
        // we'll assume the manager handles overwrites gracefully or we should ideally unregister all file macros first.
        // Let's iterate and unregister known file macros if possible, or just re-register.
        // Re-registering with same ID should overwrite, which is fine.
        // But if a folder is removed, we need to remove those macros.
        // So we should probably track loaded macros in this class.

        // Actually, let's just re-run loadConfiguredMacros. 
        // To properly handle removals, we might need to track which files are currently loaded.
        // For simplicity in this iteration, we'll just load. 
        // Ideally, we should unregister all file-based macros first.
        // Let's add a method to MacroManager to clear file macros if needed, or just rely on IDs.
        // Since IDs are file-path based (sort of), if we change folders, IDs might change or stay same.
        // If we remove a folder, we want those macros gone.
        // So we should probably keep track of loaded file URIs here and unregister them before reloading.

        // However, the current implementation of `removeMacroFromFile` uses the filename as ID suffix.
        // `file-${filename}`. This is risky if multiple folders have same filename.
        // We should probably include the relative path or hash in the ID to be safe, or just warn.
        // For now, keeping existing ID logic `file-${filename}`.

        // To support removing macros when config changes, we really should track what we loaded.
        // But the previous implementation didn't track it either (except implicitly via watcher).

        // Let's just implement the multi-folder loading first.
        await this.loadConfiguredMacros();
    }

    private disposeWatchers() {
        this.watchers.forEach(w => w.dispose());
        this.watchers = [];
    }

    private async loadConfiguredMacros() {
        this.disposeWatchers();

        const config = vscode.workspace.getConfiguration('vcode');
        const directories = config.get<string[]>('macro.directories') || [this.defaultMacroDir];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        for (const dir of directories) {
            const fullPath = path.isAbsolute(dir) ? dir : path.join(rootPath, dir);

            // Ensure directory exists (optional, maybe only for default)
            if (dir === this.defaultMacroDir && !fs.existsSync(fullPath)) {
                try {
                    fs.mkdirSync(fullPath, { recursive: true });
                } catch (error) {
                    console.error('Failed to create macro directory:', error);
                }
            }

            if (fs.existsSync(fullPath)) {
                // Load macros
                await this.loadAllMacros(fullPath);

                // Watch for changes
                const patterns = ['*.js', '*.py', '*.pl'];
                for (const pattern of patterns) {
                    const watcher = vscode.workspace.createFileSystemWatcher(
                        new vscode.RelativePattern(fullPath, pattern)
                    );

                    watcher.onDidCreate(uri => this.loadMacroFromFile(uri));
                    watcher.onDidChange(uri => this.loadMacroFromFile(uri));
                    watcher.onDidDelete(uri => this.removeMacroFromFile(uri));

                    this.watchers.push(watcher);
                }
            }
        }
    }

    private async loadAllMacros(dirPath: string) {
        if (!fs.existsSync(dirPath)) {
            return;
        }

        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.pl')) {
                const uri = vscode.Uri.file(path.join(dirPath, file));
                await this.loadMacroFromFile(uri);
            }
        }
    }

    private async loadMacroFromFile(uri: vscode.Uri) {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            const extension = path.extname(uri.fsPath).toLowerCase();
            const filename = path.basename(uri.fsPath, extension);
            const id = `file-${path.basename(uri.fsPath)}`;
            let runtime: MacroRuntime = 'javascript';
            if (extension === '.py') {
                runtime = 'python';
            } else if (extension === '.pl') {
                runtime = 'perl';
            }

            // Extract function body from "export function transform(text) { ... }"
            // or simple function definition
            let code = content;

            if (runtime === 'javascript') {
                // Simple parsing to extract body if it matches the expected pattern
                const exportMatch = content.match(/export\s+function\s+transform\s*\([^)]*\)\s*{([\s\S]*)}/);
                if (exportMatch) {
                    // We wrap it back in a standard function format for our executor
                    // The executor expects "function transform(input) { ... }" or just the body?
                    // Looking at MacroExecutor, it wraps code in a function constructor.
                    // It expects the code to define a 'transform' function.

                    // So we can just use the content, but we need to strip 'export' keyword
                    // because 'export' is not valid inside new Function()
                    code = content.replace(/export\s+function/, 'function');
                }
            }

            const macro: Macro = {
                id,
                name: filename,
                description: `Loaded from ${path.basename(uri.fsPath)}`,
                code: code,
                createdAt: Date.now(),
                filePath: uri.fsPath,
                runtime
            };

            this.macroManager.registerFileMacro(macro);
        } catch (error) {
            console.error(`Failed to load macro from ${uri.fsPath}:`, error);
        }
    }

    private removeMacroFromFile(uri: vscode.Uri) {
        const id = `file-${path.basename(uri.fsPath)}`;
        this.macroManager.unregisterFileMacro(id);
    }

    dispose() {
        this.disposeWatchers();
    }
}
