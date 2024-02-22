/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2024 Righteous AI Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// src/extension.ts

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { EntrTaskProvider } from './EntrTaskProvider';

let entrTaskProvider: vscode.Disposable | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    commonLog('Congratulations, your extension "vscode-entr" is now active!');

    const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    if (!workspaceRoot) {
        return;
    }

    entrTaskProvider = vscode.tasks.registerTaskProvider(
        EntrTaskProvider.EntrTaskScriptType,
        new EntrTaskProvider(workspaceRoot)
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    if (entrTaskProvider) {
        entrTaskProvider.dispose();
    }
}

let _channel: vscode.OutputChannel;
export function getOutputChannel(): vscode.OutputChannel {
    if (!_channel) {
        _channel = vscode.window.createOutputChannel('Entr Tasks');
    }
    return _channel;
}

export function commonLog(message: string, showConsoleLog:boolean = false) {
    getOutputChannel().appendLine(message);
    if (showConsoleLog) {
        console.log(message);
    }
}

export function commonLogInfo(message: string, showConsoleLog:boolean = false) {
    commonLog(message, showConsoleLog);
    vscode.window.showInformationMessage(message);
}

export function commonLogWarn(message: string, showConsoleLog:boolean = false) {
    commonLog(message, showConsoleLog);
    vscode.window.showWarningMessage(message);
}

export function commonLogError(message: string, showConsoleLog:boolean = false) {
    commonLog(message, showConsoleLog);
    vscode.window.showErrorMessage(message);
}
