import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { replaceInfo, replace } from '../../extension';


///////////////////////////////////////////////////////////////////////////////////////////////////
import path = require('node:path');
const testsRoot = path.resolve(__dirname, '../../../src/test/TestData');

///////////////////////////////////////////////////////////////////////////////////////////////////
async function checkText(
	testName: string,
	document: vscode.TextDocument,
	expectedTextFilePath: string
) {
	const expectedDocument = await vscode.workspace.openTextDocument(expectedTextFilePath);

	assert.strictEqual(
		document.getText(),
		expectedDocument.getText(),
		testName
	);
}

///////////////////////////////////////////////////////////////////////////////////////////////////
suite('Extension Test Suite', () => {
	test('test', async () => {
		const document = await vscode.workspace.openTextDocument(testsRoot + `/comma/sample.cpp`);
		let editor = await vscode.window.showTextDocument(document);
		editor.selections = [
			new vscode.Selection(new vscode.Position(0, 4), new vscode.Position(0, 11)),
			new vscode.Selection(new vscode.Position(1, 4), new vscode.Position(1, 28)),
			new vscode.Selection(new vscode.Position(2, 4), new vscode.Position(2, 24)),
			new vscode.Selection(new vscode.Position(3, 5), new vscode.Position(3, 33)),
			new vscode.Selection(new vscode.Position(5, 2), new vscode.Position(7, 8)),
			new vscode.Selection(new vscode.Position(9, 7), new vscode.Position(9, 15)),
			new vscode.Selection(new vscode.Position(10, 3), new vscode.Position(10, 35)),
			new vscode.Selection(new vscode.Position(11, 3), new vscode.Position(15, 3)),
		];
		const info = await replaceInfo(editor, new RegExp("\\s*,\\s*"));
		await editor.edit(editBuilder => {
			replace(editBuilder, info);
		});
		await checkText("", document, testsRoot + `/comma/result.cpp`);
	});


});
