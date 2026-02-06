import { Macro, MacroExecutionContext, MacroExecutionResult } from './types';
import * as vscode from 'vscode';
import { createRequire } from 'module';
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
            const output = await transformFunction(context.input, context, customRequire, ...params);

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
