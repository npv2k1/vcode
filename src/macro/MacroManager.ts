import * as vscode from 'vscode';
import { Macro, MacroRuntime } from './types';

/**
 * Manages macro definitions and persists them to VS Code settings
 */
export class MacroManager {
    private static readonly CONFIG_KEY = 'vcode.macros';
    private macros: Macro[] = [];
    private fileMacros: Map<string, Macro> = new Map();
    private builtinMacros: Map<string, Macro> = new Map();

    private _onDidChangeMacros = new vscode.EventEmitter<void>();
    public readonly onDidChangeMacros = this._onDidChangeMacros.event;

    constructor(private context: vscode.ExtensionContext) {
        this.loadMacros();

        // Listen for configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(MacroManager.CONFIG_KEY)) {
                    this.loadMacros();
                    this._onDidChangeMacros.fire();
                }
            })
        );
    }

    /**
     * Register a macro loaded from a file
     */
    registerFileMacro(macro: Macro): void {
        this.fileMacros.set(macro.id, { ...macro, source: 'file' });
        this._onDidChangeMacros.fire();
    }

    /**
     * Register a macro shipped with the extension
     */
    registerBuiltinMacro(macro: Macro): void {
        this.builtinMacros.set(macro.id, { ...macro, source: 'builtin' });
        this._onDidChangeMacros.fire();
    }

    /**
     * Remove all macros shipped with the extension (before a reload)
     */
    clearBuiltinMacros(): void {
        if (this.builtinMacros.size === 0) {
            return;
        }

        this.builtinMacros.clear();
        this._onDidChangeMacros.fire();
    }

    /**
     * Get the macros shipped with the extension
     */
    getBuiltinMacros(): Macro[] {
        return Array.from(this.builtinMacros.values());
    }

    /**
     * Unregister a macro loaded from a file
     */
    unregisterFileMacro(id: string): void {
        this.fileMacros.delete(id);
        this._onDidChangeMacros.fire();
    }

    /**
     * Load macros from VS Code workspace settings
     */
    private loadMacros(): void {
        const config = vscode.workspace.getConfiguration();
        const stored = config.get<Macro[]>(MacroManager.CONFIG_KEY);
        this.macros = (stored || []).map(macro => ({ ...macro, source: 'config' as const }));
    }

    /**
     * Save macros to VS Code workspace settings
     */
    private async saveMacros(): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        // `source` is derived at load time, it does not belong in settings
        const persisted = this.macros.map(({ source, ...macro }) => macro);
        await config.update(MacroManager.CONFIG_KEY, persisted, vscode.ConfigurationTarget.Global);
    }

    /**
     * Get all macros (config-based + file-based + built-in)
     */
    getMacros(): Macro[] {
        return [
            ...this.macros,
            ...Array.from(this.fileMacros.values()),
            ...Array.from(this.builtinMacros.values())
        ];
    }

    /**
     * Get a macro by ID
     */
    getMacro(id: string): Macro | undefined {
        return this.macros.find(m => m.id === id) || this.fileMacros.get(id) || this.builtinMacros.get(id);
    }

    /**
     * Add a new macro
     */
    async addMacro(name: string, description: string, code: string, runtime: MacroRuntime = 'javascript'): Promise<Macro> {
        const macro: Macro = {
            id: this.generateId(),
            name,
            description,
            code,
            createdAt: Date.now(),
            runtime
        };

        this.macros.push({ ...macro, source: 'config' });
        await this.saveMacros();
        this._onDidChangeMacros.fire();
        return macro;
    }

    /**
     * Update an existing macro
     */
    async updateMacro(id: string, updates: Partial<Omit<Macro, 'id' | 'createdAt'>>): Promise<boolean> {
        // Check if it's a file macro
        if (this.fileMacros.has(id)) {
            // We can't update file macros through this method, they must be edited on disk
            // Or we could implement writing back to file here
            return false;
        }

        // Built-in macros ship with the extension and are read-only
        if (this.builtinMacros.has(id)) {
            return false;
        }

        const index = this.macros.findIndex(m => m.id === id);
        if (index === -1) {
            return false;
        }

        this.macros[index] = {
            ...this.macros[index],
            ...updates
        };

        await this.saveMacros();
        this._onDidChangeMacros.fire();
        return true;
    }

    /**
     * Delete a macro
     */
    async deleteMacro(id: string): Promise<boolean> {
        if (this.fileMacros.has(id)) {
            // Cannot delete file macros via settings
            return false;
        }

        if (this.builtinMacros.has(id)) {
            // Cannot delete macros that ship with the extension
            return false;
        }

        const index = this.macros.findIndex(m => m.id === id);
        if (index === -1) {
            return false;
        }

        this.macros.splice(index, 1);
        await this.saveMacros();
        this._onDidChangeMacros.fire();
        return true;
    }

    /**
     * Reload macros from settings
     */
    reload(): void {
        this.loadMacros();
    }

    /**
     * Generate a unique ID for a macro
     */
    private generateId(): string {
        return `macro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
