/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2024 Righteous AI Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// src/test/EntrTaskProvider.test.ts

import * as assert from 'assert';
import * as vscode from 'vscode';
import { EntrTaskProvider } from '../EntrTaskProvider';

suite('EntrTaskProvider Test Suite', () => {
    let provider: EntrTaskProvider;

    setup(() => {
        provider = new EntrTaskProvider(vscode.workspace.rootPath || '');
    });

    test('provideTasks should return an empty array', async () => {
        const tasks = await provider.provideTasks();
        assert.strictEqual(tasks.length, 0);
    });

    test('resolveTask should return undefined for an unknown task', () => {
        const task = new vscode.Task({ type: 'unknown' }, vscode.TaskScope.Workspace, 'Test', 'test');
        const resolvedTask = provider.resolveTask(task);
        assert.strictEqual(resolvedTask, undefined);
    });

    // Add more tests as needed
});