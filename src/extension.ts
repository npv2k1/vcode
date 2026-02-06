import * as vscode from 'vscode';
import { MacroManager } from './macro/MacroManager';
import { MacroExecutor } from './macro/MacroExecutor';
import { registerMacroCommands } from './macro/macroCommands';
import { MacroFileLoader } from './macro/MacroFileLoader';
import { MacroPlaygroundProvider } from './macro/MacroPlaygroundProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vcode" is now active!');

	// Macro Feature
	console.log('Registering Macro Feature...');
	const macroManager = new MacroManager(context);
	const macroExecutor = new MacroExecutor();
	registerMacroCommands(context, macroManager, macroExecutor);

	// Macro File Loader
	console.log('Registering Macro File Loader...');
	const macroFileLoader = new MacroFileLoader(context, macroManager);
	context.subscriptions.push({ dispose: () => macroFileLoader.dispose() });

	// Macro Playground
	console.log('Registering Macro Playground...');
	try {
		const macroPlaygroundProvider = new MacroPlaygroundProvider(context.extensionUri, macroManager, macroExecutor);
		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(MacroPlaygroundProvider.viewType, macroPlaygroundProvider)
		);
		context.subscriptions.push(
			vscode.commands.registerCommand('vcode.openMacroPlayground', () => {
				macroPlaygroundProvider.createOrShow();
			})
		);
		console.log('Macro Playground Registered Successfully');
	} catch (error) {
		console.error('Failed to register Macro Playground:', error);
	}
}

export function deactivate() { }
