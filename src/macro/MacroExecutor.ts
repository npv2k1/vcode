import { Macro, MacroExecutionContext, MacroExecutionResult, MacroRuntime } from './types';
import * as vscode from 'vscode';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Executes macro functions in a sandboxed environment
 */
export class MacroExecutor {
    /**
     * Execute a macro on the given input
     * @param params Optional parameters to pass to the transform function
     */
    async execute(macro: Macro, context: MacroExecutionContext, params: any[] = []): Promise<MacroExecutionResult> {
        try {
            const executionContext: MacroExecutionContext = {
                ...context,
                globals: {
                    ...this.getGlobalVariables(),
                    ...(context.globals ?? {})
                }
            };

            const runtime = this.getRuntime(macro);
            if (runtime === 'python') {
                return await this.executePythonMacro(macro, executionContext, params);
            }

            // Create a sandboxed function from the macro code
            const transformFunction = this.createSandboxedFunction(macro.code);

            // Create a custom require function for the workspace
            // Create a custom require function
            let customRequire = require;
            let workspaceRoot: string | undefined;

            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            }

            if (macro.filePath && workspaceRoot) {
                // If we have both a macro file path and a workspace root, we try both
                const localRequire = createRequire(macro.filePath);
                const workspaceRequire = createRequire(path.join(workspaceRoot, 'index.js'));

                customRequire = ((id: string) => {
                    try {
                        return localRequire(id);
                    } catch (err: any) {
                        if (err.code === 'MODULE_NOT_FOUND') {
                            try {
                                return workspaceRequire(id);
                            } catch (workspaceErr) {
                                // If both fail, throw the original error to avoid confusion
                                throw err;
                            }
                        }
                        throw err;
                    }
                }) as any;

                // Copy properties from localRequire to keep it behaving like a real require
                Object.assign(customRequire, localRequire);

            } else if (macro.filePath) {
                customRequire = createRequire(macro.filePath);
            } else if (workspaceRoot) {
                customRequire = createRequire(path.join(workspaceRoot, 'index.js'));
            }

            // Execute the transform function with the input
            const output = await transformFunction(executionContext.input, executionContext, customRequire, ...params);

            // Validate output
            if (typeof output !== 'string') {
                return {
                    success: false,
                    error: 'Macro must return a string value'
                };
            }

            return {
                success: true,
                output
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private getGlobalVariables(): Record<string, unknown> {
        const config = vscode.workspace.getConfiguration('vcode');
        const globals = config.get<Record<string, unknown>>('macro.globals');

        if (!globals || typeof globals !== 'object' || Array.isArray(globals)) {
            return {};
        }

        return globals;
    }

    private getRuntime(macro: Macro): MacroRuntime {
        if (macro.runtime) {
            return macro.runtime;
        }

        if (macro.filePath && macro.filePath.toLowerCase().endsWith('.py')) {
            return 'python';
        }

        return 'javascript';
    }

    private getPythonPath(): string {
        const config = vscode.workspace.getConfiguration('vcode');
        const configured = config.get<string>('macro.python.path');
        if (configured && configured.trim().length > 0) {
            return configured;
        }

        const pythonConfig = vscode.workspace.getConfiguration('python');
        const defaultInterpreterPath = pythonConfig.get<string>('defaultInterpreterPath');
        if (defaultInterpreterPath && defaultInterpreterPath.trim().length > 0) {
            return defaultInterpreterPath;
        }

        return 'python3';
    }

    private getPythonRunnerCode(): string {
        return [
            'import json, sys, os, importlib.util',
            'macro_path = sys.argv[1]',
            'payload = json.load(sys.stdin)',
            'input_text = payload.get("input", "")',
            'context = payload.get("context", {})',
            'params = payload.get("params", [])',
            'macro_dir = os.path.dirname(os.path.abspath(macro_path))',
            'if macro_dir and macro_dir not in sys.path:',
            '    sys.path.insert(0, macro_dir)',
            'spec = importlib.util.spec_from_file_location("vcode_macro", macro_path)',
            'if spec is None or spec.loader is None:',
            '    raise RuntimeError("Failed to load macro file")',
            'module = importlib.util.module_from_spec(spec)',
            'spec.loader.exec_module(module)',
            'transform = getattr(module, "transform", None)',
            'if not callable(transform):',
            '    raise RuntimeError("Python macro must define a callable transform(input, context, *args)")',
            'result = transform(input_text, context, *params)',
            'if result is None:',
            '    result = ""',
            'if not isinstance(result, str):',
            '    result = str(result)',
            'sys.stdout.write(result)'
        ].join('\n');
    }

    private async ensurePythonMacroFile(macro: Macro): Promise<{ filePath: string; cleanup?: () => Promise<void> }> {
        if (macro.filePath) {
            return { filePath: macro.filePath };
        }

        if (!macro.code || macro.code.trim().length === 0) {
            throw new Error('Python macro requires a file path or inline code');
        }

        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vcode-macro-'));
        const filePath = path.join(tempDir, 'macro.py');
        await fs.promises.writeFile(filePath, macro.code, 'utf8');

        return {
            filePath,
            cleanup: async () => {
                await fs.promises.rm(tempDir, { recursive: true, force: true });
            }
        };
    }

    private formatPythonSpawnError(pythonPath: string, error: unknown): string {
        if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as { code?: string }).code;
            if (code === 'ENOENT') {
                return `Python interpreter not found. Configure "vcode.macro.python.path" or ensure "${pythonPath}" is on PATH.`;
            }
        }

        return `Failed to run Python macro: ${error instanceof Error ? error.message : String(error)}`;
    }

    private async executePythonMacro(
        macro: Macro,
        context: MacroExecutionContext,
        params: any[]
    ): Promise<MacroExecutionResult> {
        const { filePath, cleanup } = await this.ensurePythonMacroFile(macro);
        try {
            const pythonPath = this.getPythonPath();
            const runnerCode = this.getPythonRunnerCode();
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const cwd = workspaceRoot ?? path.dirname(filePath);

            let payloadJson: string;
            try {
                payloadJson = JSON.stringify({
                    input: context.input,
                    context,
                    params
                });
            } catch (error) {
                return {
                    success: false,
                    error: `Failed to serialize context for Python: ${error instanceof Error ? error.message : String(error)}`
                };
            }

            return await new Promise<MacroExecutionResult>((resolve) => {
                let settled = false;
                const finish = (result: MacroExecutionResult) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    resolve(result);
                };

                const child = spawn(pythonPath, ['-u', '-c', runnerCode, filePath], {
                    cwd,
                    env: {
                        ...process.env,
                        PYTHONIOENCODING: 'utf-8',
                        PYTHONUTF8: '1'
                    }
                });

                let stdout = '';
                let stderr = '';

                child.stdout.setEncoding('utf8');
                child.stderr.setEncoding('utf8');

                child.stdout.on('data', data => {
                    stdout += data;
                });

                child.stderr.on('data', data => {
                    stderr += data;
                });

                child.on('error', error => {
                    finish({ success: false, error: this.formatPythonSpawnError(pythonPath, error) });
                });

                child.on('close', code => {
                    if (code === null) {
                        finish({
                            success: false,
                            error: stderr.trim() || 'Python process terminated unexpectedly'
                        });
                        return;
                    }

                    if (code !== 0) {
                        finish({
                            success: false,
                            error: stderr.trim() || `Python exited with code ${code}`
                        });
                        return;
                    }

                    finish({ success: true, output: stdout });
                });

                try {
                    child.stdin.write(payloadJson);
                    child.stdin.end();
                } catch (error) {
                    finish({
                        success: false,
                        error: `Failed to send input to Python: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            });
        } finally {
            if (cleanup) {
                await cleanup();
            }
        }
    }

    /**
     * Create a sandboxed function from macro code
     * The macro code should define a function named 'transform'
     */
    private createSandboxedFunction(code: string): (input: string, context: MacroExecutionContext, require: NodeRequire, ...args: any[]) => Promise<string> {
        try {
            // Create a new function that wraps the user code
            // Make require available in the scope
            const wrappedCode = `
                ${code}
                return transform(input, context, ...args);
            `;

            // Create function with require in scope
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const fn = new Function('input', 'context', 'require', '...args', wrappedCode);

            return async (input: string, context: MacroExecutionContext, require: NodeRequire, ...args: any[]) => {
                // Execute with limited context
                const result = await fn.call(null, input, context, require, ...args);
                return result;
            };
        } catch (error) {
            throw new Error(`Failed to create macro function: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate macro code syntax
     */
    validateMacroCode(code: string): { valid: boolean; error?: string } {
        try {
            // Try to create the function
            this.createSandboxedFunction(code);
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Extract parameter names from the transform function
     * Returns parameters beyond 'input' and 'context'
     */
    extractParameters(code: string): string[] {
        try {
            // Match function signature with various patterns:
            // - function transform(...)
            // - async function transform(...)
            // - export function transform(...)
            // - export async function transform(...)
            const functionMatch = code.match(/(?:export\s+)?(?:async\s+)?function\s+transform\s*\(([^)]*)\)/);
            if (!functionMatch) {
                return [];
            }

            const paramsString = functionMatch[1];
            if (!paramsString.trim()) {
                return [];
            }

            // Split by comma and clean up parameter names
            const params = paramsString.split(',').map(p => {
                // Remove default values and destructuring
                let paramName = p.trim();

                // Handle default parameters (e.g., "param = defaultValue")
                if (paramName.includes('=')) {
                    paramName = paramName.split('=')[0].trim();
                }

                // Handle destructuring (simple case - just skip complex destructuring)
                if (paramName.startsWith('{') || paramName.startsWith('[')) {
                    return '';
                }

                return paramName;
            }).filter(p => p !== '');

            // Filter out 'input' and 'context' and any rest parameters
            const extraParams = params.filter(p =>
                p !== 'input' &&
                p !== 'context' &&
                !p.startsWith('...')
            );

            return extraParams;
        } catch (error) {
            return [];
        }
    }
}
