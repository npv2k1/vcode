import * as vscode from 'vscode';

/**
 * Represents a macro definition
 */
export type MacroRuntime = 'javascript' | 'python' | 'perl';

/** Where a macro came from */
export type MacroSource = 'config' | 'file' | 'builtin';

export interface Macro {
    /** Unique identifier for the macro */
    id: string;
    /** Display name of the macro */
    name: string;
    /** Description of what the macro does */
    description: string;
    /** Macro code as a string (JavaScript, Python, or Perl) */
    code: string;
    /** Macro runtime (defaults to javascript) */
    runtime?: MacroRuntime;
    /** When the macro was created */
    /** When the macro was created */
    createdAt: number;
    /** Path to the macro file (if loaded from file) */
    filePath?: string;
    /** Where the macro came from (defaults to config) */
    source?: MacroSource;
    /** Grouping label, used by the built-in macro library */
    category?: string;
    /** Original file name (built-in and file macros) */
    fileName?: string;
}

/**
 * Metadata declared in the header of a built-in macro script
 */
export interface BuiltinMacroMetadata {
    /** Display name of the macro */
    name: string;
    /** Description of what the macro does */
    description: string;
    /** Grouping label shown when browsing the library */
    category: string;
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
