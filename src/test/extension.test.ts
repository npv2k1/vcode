import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { parseBuiltinMacroMetadata, BUILTIN_MACRO_DIR } from '../macro/BuiltinMacroLibrary';
import { MacroManager } from '../macro/MacroManager';
import { Macro } from '../macro/types';

const builtinMacroDir = path.join(__dirname, '..', '..', ...BUILTIN_MACRO_DIR);

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});

suite('Built-in Macro Library', () => {
	test('parses metadata tags from a script header', () => {
		const metadata = parseBuiltinMacroMetadata(
			[
				'/**',
				' * @name Format SQL',
				' * @description Start each SQL keyword on a new line.',
				' * @category SQL',
				' */',
				'function transform(input) { return input; }'
			].join('\n'),
			'format-sql'
		);

		assert.strictEqual(metadata.name, 'Format SQL');
		assert.strictEqual(metadata.description, 'Start each SQL keyword on a new line.');
		assert.strictEqual(metadata.category, 'SQL');
	});

	test('falls back to the file name when tags are missing', () => {
		const metadata = parseBuiltinMacroMetadata('function transform(input) { return input; }', 'my-macro');

		assert.strictEqual(metadata.name, 'my-macro');
		assert.strictEqual(metadata.category, 'General');
		assert.ok(metadata.description.includes('my-macro'));
	});

	test('every bundled macro declares metadata and a transform function', () => {
		const files = fs.readdirSync(builtinMacroDir).filter(file => file.endsWith('.js'));
		assert.ok(files.length > 0, 'expected bundled macro scripts');

		for (const file of files) {
			const content = fs.readFileSync(path.join(builtinMacroDir, file), 'utf8');
			const metadata = parseBuiltinMacroMetadata(content, path.basename(file, '.js'));

			assert.ok(content.includes('@name'), `${file} is missing @name`);
			assert.ok(content.includes('@description'), `${file} is missing @description`);
			assert.ok(/function\s+transform\s*\(/.test(content), `${file} is missing a transform function`);
			assert.notStrictEqual(metadata.category, 'General', `${file} is missing @category`);
		}
	});

	test('built-in macros are registered and read-only', async () => {
		const manager = new MacroManager({ subscriptions: [] } as unknown as vscode.ExtensionContext);
		const macro: Macro = {
			id: 'builtin-uppercase',
			name: 'Uppercase',
			description: 'Convert the selection to upper case.',
			category: 'Text',
			code: 'function transform(input) { return input.toUpperCase(); }',
			createdAt: Date.now(),
			runtime: 'javascript'
		};

		manager.registerBuiltinMacro(macro);

		assert.strictEqual(manager.getBuiltinMacros().length, 1);
		assert.strictEqual(manager.getMacro('builtin-uppercase')?.source, 'builtin');
		assert.strictEqual(await manager.updateMacro('builtin-uppercase', { name: 'Renamed' }), false);
		assert.strictEqual(await manager.deleteMacro('builtin-uppercase'), false);

		manager.clearBuiltinMacros();
		assert.strictEqual(manager.getBuiltinMacros().length, 0);
	});
});
