/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2024 Righteous AI Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// src/EntrTaskProvider.ts

import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { commonLog, commonLogError } from './extension';

interface EntrTaskDefinition extends vscode.TaskDefinition {
    targetTask: string;
    files: string[];
    ignoreCreateEvents: boolean;
    ignoreChangeEvents: boolean;
    ignoreDeleteEvents: boolean;
    onlyFiles: boolean;
    pauseMsBeforeRun: number;
    runningTaskBehavior: string;
    runningTaskBehaviorBatchThrottleSeconds: number;

    equals(a: EntrTaskDefinition, b: EntrTaskDefinition) : boolean;
}

const DEFAULT_TASK_CONFIG: EntrTaskDefinition = {
    type: "entr",
    targetTask: "",
    name: "",
    files: ["**/*.*"],
    ignoreCreateEvents: false,
    ignoreChangeEvents: false,
    ignoreDeleteEvents: false,
    onlyFiles: false,
    pauseMsBeforeRun: 100,
    runningTaskBehavior: "batch",
    runningTaskBehaviorBatchThrottleSeconds: 30,
    // other default properties

    equals(a: EntrTaskDefinition, b: EntrTaskDefinition): boolean {
        const aProps = Object.getOwnPropertyNames(a);
        const bProps = Object.getOwnPropertyNames(b);

        if (aProps.length !== bProps.length) {
            return false;
        }

        for (let i = 0; i < aProps.length; i++) {
            const propName = aProps[i];

            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        return true;
    },
};

export class EntrTaskProvider implements vscode.TaskProvider {
    static EntrTaskScriptType = DEFAULT_TASK_CONFIG.type;

    private tasks: vscode.Task[] = [];

    // We use a CustomExecution task when state needs to be shared across runs of the task or when 
    // the task requires use of some VS Code API to run.
    // If you don't need to share state between runs and if you don't need to execute VS Code API in your task, 
    // then a simple ShellExecution or ProcessExecution should be enough.
    // Since our build has this shared state, the CustomExecution is used below.
    private sharedState: string | undefined;

    constructor(private workspaceRoot: string) {
        commonLog('EntrTaskProvider: constructor');
    }

    public async provideTasks(): Promise<vscode.Task[]> {
        commonLog('EntrTaskProvider: provideTasks');
        // These are for dynamic tasks that do not need to be explicitly defined in tasks.json
        return [];
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        if (_task && _task.definition && _task.definition.type !== EntrTaskProvider.EntrTaskScriptType) {
            return undefined;
        }

        commonLog('EntrTaskProvider: resolveTask: _task.definition: ' + JSON.stringify(_task.definition));
        const definition: EntrTaskDefinition = <any>_task.definition;
        let output = this.getTask(
            definition
        );
        commonLog('EntrTaskProvider: resolveTask: output:' + JSON.stringify(output));
        return output;
    }

    private getTask(definition: EntrTaskDefinition): vscode.Task {
        commonLog('EntrTaskProvider: getTask: definition:' + JSON.stringify(definition));
        try {
            // compare the task definition with existing tasks in "this.tasks"

            // If a task with the same definition already exists, return it
            let existingTask = this.tasks.find(
                (t) => DEFAULT_TASK_CONFIG.equals(
                    t.definition as EntrTaskDefinition,
                    definition
                )
            );
            if (existingTask) {
                commonLog('EntrTaskProvider: getTask: existingTask:' + JSON.stringify(existingTask));
                return existingTask;
            } else {
                commonLog('EntrTaskProvider: getTask: No existing task found for definition:' + JSON.stringify(definition));

                // Replace the task definition with the default task configuration
                let newTask = new vscode.Task(
                    definition,
                    vscode.TaskScope.Workspace,
                    definition.name ?? `entr: ${definition.targetTask}`,
                    EntrTaskProvider.EntrTaskScriptType, new vscode.CustomExecution(
                        async (): Promise<vscode.Pseudoterminal> => {
                            // When the task is executed, this callback will run. Here, we setup for running the task.
                            return new EntrTaskTerminal(
                                this.workspaceRoot,
                                definition,
                                () => this.sharedState,
                                (state: string) => this.sharedState = state
                            );
                        }
                    )
                );
                // Replace the new task with the existing task in "this.tasks"
                this.tasks = this.tasks.map(t => t.definition === definition ? newTask : t);
                commonLog('EntrTaskProvider: getTask: output:' + JSON.stringify(newTask));
                return newTask;
            }

        } catch (error) {
            commonLogError('EntrTaskProvider: getTask: error:' + error);
            throw error;
        }
    }
}

class EntrTaskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    private closeEmitter = new vscode.EventEmitter<number>();
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;

    private fileWatchers: vscode.FileSystemWatcher[] | undefined;

    private waitForRunningTask: boolean = false;

    constructor(
        private workspaceRoot: string,
        private taskDefinition: EntrTaskDefinition,
        private getSharedState: () => string | undefined,
        private setSharedState: (state: string) => void
    ) {
        this.taskDefinition = Object.assign({}, DEFAULT_TASK_CONFIG, taskDefinition);
        commonLog('EntrTaskTerminal: constructor: workspaceRoot: ' + workspaceRoot + 'taskDefinition: ' + JSON.stringify(taskDefinition));
    }

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        commonLog('EntrTaskTerminal: open: initialDimensions: ' + JSON.stringify(initialDimensions));
        this.close(); // Close any existing file watcher
        if (!this.taskDefinition.files) {
            this.taskDefinition.files = DEFAULT_TASK_CONFIG.files;
        }
        for (let f of this.taskDefinition.files)
        {
            commonLog('EntrTaskTerminal: open: f: ' + f);
            const pattern = path.join(this.workspaceRoot, f);
            commonLog('EntrTaskTerminal: open: pattern: ' + pattern);

            let fw = vscode.workspace.createFileSystemWatcher(
                pattern,
                this.taskDefinition.ignoreCreateEvents,
                this.taskDefinition.ignoreChangeEvents,
                this.taskDefinition.ignoreDeleteEvents
            );
            fw.onDidChange((e: vscode.Uri) => this.doBuild(e, "changed"));
            fw.onDidCreate((e: vscode.Uri) => this.doBuild(e, "created"));
            fw.onDidDelete((e: vscode.Uri) => this.doBuild(e, "deleted"));
            if (!this.fileWatchers) {
                this.fileWatchers = [];
            }
            this.fileWatchers.push(fw);
        }
        this.doBuild();
    }

    close(): void {
        // The terminal has been closed. Shutdown the build.
        if (this.fileWatchers) {
            commonLog('EntrTaskTerminal: close');
            for (let fw of this.fileWatchers) {
                fw.dispose();
            }
        }
    }

    private async doBuild(e?: vscode.Uri, action?:string): Promise<void> {
        commonLog('EntrTaskTerminal: doBuild');
        return new Promise<void>(async (resolve) => {

            let logInAllPlaces = (message: string) => {
                this.writeEmitter.fire(message);
                commonLog(`EntrTaskTerminal: doBuild: ${message}`);
            };

            let message = "---\r\n";
            if (e && action)
            {
                if (action !== "deleted") {
                    let stats = fs.statSync(e.fsPath);
                    if (stats.isFile()) {
                        message += `File ${e.fsPath} was ${action}.\r\n`;
                    } else if (stats.isDirectory()) {
                        if (this.taskDefinition.onlyFiles) {
                            message += `Directory ${e.fsPath} was ${action}, but task is configured to only watch files.\r\n`;
                            return;
                        }
                        message += `Directory ${e.fsPath} was ${action}.\r\n`;
                    }
                } else {
                    message += `File/Directory ${e.fsPath} was ${action}.\r\n`;
                }
            } else {
                message += "Running task first time! ...\r\n";
            }

            if (this.waitForRunningTask) {
                message += "Waiting for running task to finish before launching another instance ...\r\n";
                logInAllPlaces(message);
                return;
            }

            logInAllPlaces(message);

            // If there is a pause before running the target task
            if (this.taskDefinition.pauseMsBeforeRun)
            {
                // Pause milliseconds before running the target task
                new Promise(
                    resolve => setTimeout(resolve, this.taskDefinition.pauseMsBeforeRun)
                );
            }

            let tasks = await vscode.tasks.fetchTasks();
            let task = tasks.find(t => t.name === this.taskDefinition.targetTask);
            if (task) {
                let runTask:boolean = true;

                do {
                    this.waitForRunningTask = false;
                    vscode.tasks.taskExecutions.filter(
                        te => te.task.name === this.taskDefinition.targetTask
                    ).forEach(
                        (te) => {
                            if (this.taskDefinition.runningTaskBehavior === "terminate") {
                                message = `Terminating running task '${this.taskDefinition.targetTask}' ...\r\n`;
                                logInAllPlaces(message);
                                te.terminate();
                                runTask = false; // Do not run the target task
                            } else if (this.taskDefinition.runningTaskBehavior === "restart") {
                                message = `Restarting running task '${this.taskDefinition.targetTask}' ...\r\n`;
                                logInAllPlaces(message);
                                te.terminate();
                            } else if (this.taskDefinition.runningTaskBehavior === "batch") {
                                this.waitForRunningTask = true;
                            }
                        }
                    );
                    if (this.waitForRunningTask) {
                        // Wait for the running task to finish
                        message = `Waiting ${this.taskDefinition.runningTaskBehaviorBatchThrottleSeconds} seconds for running task '${this.taskDefinition.targetTask}' to finish before launching another instance ...\r\n`;
                        logInAllPlaces(message);
                        await new Promise(
                            resolve => setTimeout(
                                resolve,
                                1000*this.taskDefinition.runningTaskBehaviorBatchThrottleSeconds
                            )
                        );
                    }
                } while (this.waitForRunningTask);

                if (runTask) {
                    // Run the target task
                    message = `Running task '${this.taskDefinition.targetTask}' ...\r\n`;
                    logInAllPlaces(message);
                    vscode.tasks.executeTask(task);
                }
            } else {
                message = `Task '${this.taskDefinition.targetTask}' not found!\r\n`;
                this.writeEmitter.fire(message);
                commonLogError(message);
            }
        });
    }
}
