import * as vscode from 'vscode';

/**
 * Represents a macro definition
 */
export type MacroRuntime = 'javascript' | 'python';

export interface Macro {
    /** Unique identifier for the macro */
    id: string;
    /** Display name of the macro */
    name: string;
    /** Description of what the macro does */
    description: string;
    /** Macro code as a string (JavaScript or Python) */
    code: string;
    /** Macro runtime (defaults to javascript) */
    runtime?: MacroRuntime;
    /** When the macro was created */
    /** When the macro was created */
    createdAt: number;
    /** Path to the macro file (if loaded from file) */
    filePath?: string;
}

/**
 * Context passed to macro execution
 */
export interface MacroExecutionContext {
    /** The selected text or full document text */
    input: string;
    /** Language ID of the current document */
    languageId: string;
    /** Current file path (if available) */
    filePath?: string;
    /** Global variables from VCode settings */
    globals?: Record<string, unknown>;
}

/**
 * Result of macro execution
 */
export interface MacroExecutionResult {
    /** Whether execution was successful */
    success: boolean;
    /** Transformed output (if successful) */
    output?: string;
    /** Error message (if failed) */
    error?: string;
}
