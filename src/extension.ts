import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	
	console.log('Congratulations, your extension "rotate-args" is now active!');

	let disposable = vscode.commands.registerCommand('rotate-args.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Rotate Args!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
