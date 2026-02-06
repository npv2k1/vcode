import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MacroManager } from './MacroManager';
import { MacroExecutor } from './MacroExecutor';
import { Macro } from './types';

export class MacroPlaygroundProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vcode.macroPlayground';
    private _view?: vscode.WebviewView;
    private _panel?: vscode.WebviewPanel;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _macroManager: MacroManager,
        private readonly _macroExecutor: MacroExecutor
    ) {
        // Listen for macro changes
        this._macroManager.onDidChangeMacros(() => {
            this.updateAllWebviews();
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this._setWebviewMessageListener(webviewView.webview);
    }

    public createOrShow() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (this._panel) {
            this._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        this._panel = vscode.window.createWebviewPanel(
            MacroPlaygroundProvider.viewType,
            'Macro Playground',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._setWebviewMessageListener(this._panel.webview);

        this._panel.onDidDispose(() => {
            this._panel = undefined;
        }, null, []);
    }

    private updateAllWebviews() {
        if (this._view) {
            this.sendMacrosToWebview(this._view.webview);
        }
        if (this._panel) {
            this.sendMacrosToWebview(this._panel.webview);
        }
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'runMacro':
                    this.runMacro(data.code, data.input, data.runtime, webview);
                    break;
                case 'saveMacro':
                    await this.saveMacro(data.name, data.code, data.runtime, webview);
                    break;
                case 'loadMacros':
                    this.sendMacrosToWebview(webview);
                    break;
                case 'loadMacroContent':
                    this.loadMacroContent(data.id, webview);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Simple HTML for the playground
        // In a real app, we might want to use a separate HTML file or a frontend framework
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Macro Playground</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 10px;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            height: 100vh;
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        label {
            font-weight: bold;
            font-size: 12px;
        }
        textarea {
            width: 100%;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 5px;
            font-family: 'Consolas', 'Courier New', monospace;
            resize: vertical;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .toolbar {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        select {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px;
        }
        #output {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
        .error {
            color: var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="section">
            <label>Load Macro:</label>
            <div class="toolbar">
                <select id="macroSelect">
                    <option value="">-- Select a Macro --</option>
                </select>
                <button id="btnLoad">Load</button>
            </div>
        </div>

        <div class="section">
            <label>Macro Name (for saving):</label>
            <input type="text" id="macroName" placeholder="My Macro" style="width: 100%; padding: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border);">
        </div>

        <div class="section">
            <label>Runtime:</label>
            <select id="macroRuntime">
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
            </select>
        </div>

        <div class="section" style="flex-grow: 1;">
            <label>Macro Code:</label>
            <textarea id="codeEditor" style="height: 150px;">function transform(input) {
    return input;
}</textarea>
        </div>

        <div class="section">
            <label>Test Input:</label>
            <textarea id="inputEditor" style="height: 80px;">Hello World</textarea>
        </div>

        <div class="toolbar">
            <button id="btnRun">Run / Test</button>
            <button id="btnSave">Save to File</button>
        </div>

        <div class="section">
            <label>Output:</label>
            <textarea id="output" readonly style="height: 80px;"></textarea>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Elements
        const macroSelect = document.getElementById('macroSelect');
        const btnLoad = document.getElementById('btnLoad');
        const macroName = document.getElementById('macroName');
        const macroRuntime = document.getElementById('macroRuntime');
        const codeEditor = document.getElementById('codeEditor');
        const inputEditor = document.getElementById('inputEditor');
        const btnRun = document.getElementById('btnRun');
        const btnSave = document.getElementById('btnSave');
        const output = document.getElementById('output');

        // Initial Load
        vscode.postMessage({ type: 'loadMacros' });

        // Event Listeners
        btnLoad.addEventListener('click', () => {
            const id = macroSelect.value;
            if (id) {
                vscode.postMessage({ type: 'loadMacroContent', id });
            }
        });

        btnRun.addEventListener('click', () => {
            vscode.postMessage({
                type: 'runMacro',
                code: codeEditor.value,
                input: inputEditor.value,
                runtime: macroRuntime.value
            });
        });

        btnSave.addEventListener('click', () => {
            const name = macroName.value;
            if (!name) {
                // Show error in output? or just alert if possible (alert not allowed usually)
                output.value = 'Error: Please enter a macro name to save.';
                return;
            }
            vscode.postMessage({
                type: 'saveMacro',
                name: name,
                code: codeEditor.value,
                runtime: macroRuntime.value
            });
        });

        // Handle Messages
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateMacros':
                    macroSelect.innerHTML = '<option value="">-- Select a Macro --</option>';
                    message.macros.forEach(m => {
                        const option = document.createElement('option');
                        option.value = m.id;
                        const runtimeLabel = m.runtime === 'python' ? 'Py' : 'JS';
                        option.textContent = m.name + ' (' + runtimeLabel + ')' + (m.id.startsWith('file-') ? ' (File)' : '');
                        macroSelect.appendChild(option);
                    });
                    break;
                case 'setMacroContent':
                    codeEditor.value = message.code;
                    macroName.value = message.name;
                    if (message.runtime) {
                        macroRuntime.value = message.runtime;
                    } else {
                        macroRuntime.value = 'javascript';
                    }
                    break;
                case 'executionResult':
                    if (message.success) {
                        output.value = message.output;
                        output.classList.remove('error');
                    } else {
                        output.value = 'Error: ' + message.error;
                        output.classList.add('error');
                    }
                    break;
                case 'saveResult':
                    if (message.success) {
                        output.value = 'Saved successfully to ' + message.path;
                    } else {
                        output.value = 'Error saving: ' + message.error;
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    private sendMacrosToWebview(webview: vscode.Webview) {
        const macros = this._macroManager.getMacros().map(macro => ({
            ...macro,
            runtime: macro.runtime ?? (macro.filePath && macro.filePath.toLowerCase().endsWith('.py') ? 'python' : 'javascript')
        }));
        webview.postMessage({ type: 'updateMacros', macros });
    }

    private loadMacroContent(id: string, webview: vscode.Webview) {
        const macro = this._macroManager.getMacro(id);
        if (macro) {
            webview.postMessage({
                type: 'setMacroContent',
                code: macro.code,
                name: macro.name,
                runtime: macro.runtime ?? (macro.filePath && macro.filePath.toLowerCase().endsWith('.py') ? 'python' : 'javascript')
            });
        }
    }

    private async runMacro(code: string, input: string, runtime: string | undefined, webview: vscode.Webview) {
        // Create a temporary macro object
        const tempMacro: Macro = {
            id: 'temp',
            name: 'Temp',
            description: 'Temp',
            code: code,
            createdAt: Date.now(),
            runtime: runtime === 'python' ? 'python' : 'javascript'
        };

        const result = await this._macroExecutor.execute(tempMacro, {
            input: input,
            languageId: 'plaintext'
        });

        webview.postMessage({
            type: 'executionResult',
            success: result.success,
            output: result.output,
            error: result.error
        });
    }

    private async saveMacro(name: string, code: string, runtime: string | undefined, webview: vscode.Webview) {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace open');
            }

            const macroDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'macro');
            if (!fs.existsSync(macroDir)) {
                fs.mkdirSync(macroDir, { recursive: true });
            }

            // Sanitize filename
            const extension = runtime === 'python' ? '.py' : '.js';
            const filename = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + extension;
            const filePath = path.join(macroDir, filename);

            let fileContent = code;
            if (extension === '.js' && !code.includes('export function')) {
                if (code.trim().startsWith('function')) {
                    fileContent = 'export ' + code;
                } else {
                    if (code.trim().startsWith('function transform')) {
                        fileContent = 'export ' + code;
                    }
                }
            }

            await fs.promises.writeFile(filePath, fileContent, 'utf8');

            webview.postMessage({
                type: 'saveResult',
                success: true,
                path: filePath
            });
        } catch (error) {
            webview.postMessage({
                type: 'saveResult',
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
