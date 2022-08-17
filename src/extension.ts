import * as vscode from 'vscode';

///////////////////////////////////////////////////////////////////////////////////////////////////
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('rotate-args.byComma', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }

			const separator = new RegExp("\\s*,\\s*");
			exec(editor, separator);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('rotate-args.byEqual', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }

			const separator = new RegExp("\\s*=\\s*");
			exec(editor, separator);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('rotate-args.bySpace', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }

			const separator = new RegExp("\\s+");
			exec(editor, separator);
		})
	);

}

export function deactivate() {}

///////////////////////////////////////////////////////////////////////////////////////////////////
function offset(document: vscode.TextDocument, pos: vscode.Position, val: number): vscode.Position {
	const offset = document.offsetAt(pos);
	const nextOffset = offset + val;
	return document.positionAt(nextOffset);
}

async function move(editor: vscode.TextEditor, pos: vscode.Position): Promise<vscode.Position>{
	const nxtPos = offset(editor.document, pos, 1);

	const line = editor.document.lineAt(pos);
	if (nxtPos.isEqual(pos) && nxtPos.isEqual(line.range.end)) {
		// 改行コードが LF の場合に、問題になるっぽい？
		return line.rangeIncludingLineBreak.end;
	}

	const char = editor.document.getText(new vscode.Range(pos, nxtPos));
	const isBracket = (
		char[0] === '{' ||
		char[0] === '(' ||
		char[0] === '['
	);
	if (!isBracket) { return nxtPos; }


	editor.selection = new vscode.Selection(pos, pos);

	await vscode.commands.executeCommand('editor.action.jumpToBracket');
	const bracketPairPos = editor.selection.start;
	if (pos.isEqual(bracketPairPos)) {
		return nxtPos;
	}

	await vscode.commands.executeCommand('editor.action.jumpToBracket');
	const revbrancketpos = editor.selection.start;
	if (!revbrancketpos.isEqual(pos)) {
		return nxtPos;
	}

	return bracketPairPos;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
interface Divided {
	argAry: string[],
	separatorAry: string[],
}
async function divide(editor: vscode.TextEditor, range: vscode.Range, separator: RegExp): Promise<Divided> {
	let result: Divided = { argAry: [], separatorAry: [] };

	editor.selection = new vscode.Selection(range.start, range.start);
	let lastDividedPos = range.start;
	let cursol = range.start;
	while(true){
		cursol = await move(editor, cursol);
		if (cursol.isAfterOrEqual(range.end)) {
			break;
		}

		const remain = editor.document.getText(new vscode.Range(cursol, range.end));
		const matched = remain.match(separator);
		if (!matched) { continue; }
		if (matched.index !== 0) { continue; }

		const curSeparator = matched[0];
		result.argAry.push(editor.document.getText(new vscode.Range(lastDividedPos, cursol)));
		result.separatorAry.push(curSeparator);

		cursol = offset(editor.document, cursol, curSeparator.length);
		lastDividedPos = cursol;
	}


	const remain = editor.document.getText(new vscode.Range(lastDividedPos, range.end));
	if(remain.length!==0){
		result.argAry.push(remain);
	}
	return result;
}

function rotate(divided: Divided): string {
	var result = "";
	for (let idx = 0; idx < divided.argAry.length; idx++) {
		const rotIdx = (idx +divided.argAry.length - 1) % divided.argAry.length;
		result += divided.argAry[rotIdx];

		if (idx < divided.separatorAry.length) {
			result += divided.separatorAry[idx];
		}
	}
	return result;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
export async function replaceInfo(editor: vscode.TextEditor,separator:RegExp): Promise<Array<[vscode.Range, string]>> {
	var result = new Array<[vscode.Range, string]>();

	const orgSelections = editor.selections;
	for(const orgSelection of orgSelections) {
		const selection = await normalizeSelection(editor, orgSelection);
		const divided = await divide(editor, selection, separator);
		const newStr = rotate(divided);
		result.push([selection, newStr]);
	}
	editor.selections = orgSelections;

	return result;
}

export function replace(editBuilder: vscode.TextEditorEdit, replaceInfo: Array<[vscode.Range, string]>) {
	for (const info of replaceInfo) {
		editBuilder.replace(info[0], info[1]);
	}
}

async function exec(editor: vscode.TextEditor,separator:RegExp) {
	const info = await replaceInfo(editor, separator);

	editor.edit(editBuilder => {
		replace(editBuilder, info);
	});
}

///////////////////////////////////////////////////////////////////////////////////////////////////
async function isBracketSelect(editor: vscode.TextEditor, selection: vscode.Selection): Promise<Boolean>{
	editor.selection = new vscode.Selection(selection.start, selection.start);
	await vscode.commands.executeCommand('editor.action.jumpToBracket');
	return editor.selection.start.translate(0, 1).isEqual(selection.end);
}

function matchLength(str:string,regexp:RegExp):number{
	const matched = str.match(regexp);
	if (!matched) { return 0; }
	return matched[0].length;
}

function trimSpacesFromSelection(document: vscode.TextDocument, selection: vscode.Selection): vscode.Selection{

	const str = document.getText(selection);

	const frontBlank = new RegExp("^\\s+");
	const frontBlankLength = matchLength(str, frontBlank);

	const trailBlank = new RegExp("\\s+$");
	const trailBlankLength = matchLength(str, trailBlank);

	return new vscode.Selection(
		offset(document, selection.start, +frontBlankLength),
		offset(document, selection.end, -trailBlankLength),
	);
}

async function normalizeSelection(editor: vscode.TextEditor, org: vscode.Selection): Promise<vscode.Selection>{
	var result = org;

	if (await isBracketSelect(editor, org)) {
		result = new vscode.Selection(org.start.translate(0, 1), org.end.translate(0, -1));
	}

	return trimSpacesFromSelection(editor.document, result);
}

