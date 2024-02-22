# Extension `vscode-entr` for Visual Studio Code

<img src="media/icon.png" height="64px" />

An extension for Visual Studio Code that triggers existing tasks based on file system changes.

Heavily inspired by the [`entr` command line tool](https://eradman.com/entrproject/) and [`File Watcher` extension](https://marketplace.visualstudio.com/items?itemName=Appulate.filewatcher), this extension aims to provide a simple way to trigger Visual Studio Code tasks.

You can download the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=righteouslabs.vscode-entr) or from [Open VSX Registry](https://open-vsx.org/extension/righteouslabs/vscode-entr).

## Usage

### Configuration (Triggering Tasks)

1. Follow the [official guide](https://code.visualstudio.com/docs/editor/tasks) to create a `tasks.json` file.
1. Add a task to the `tasks.json` file. For example:

    ```jsonc
    // .vscode/tasks.json
    {
        "version": "2.0.0",
        "tasks": [
            // 👉 This is the target task to trigger on file changes
            {
                "type": "process",
                "command": "echo Hello World!",
                "label": "echo",
                "problemMatcher": []
            },
            // 👇 This is the task that triggers your target task
            {
                // ////////////////////
                // Built-in Fields:
                "label": "entr: echo",
                "problemMatcher": [],

                // ////////////////////
                // Required Fields:
                "type": "entr", // Constant value
                "targetTask": "echo", // 👈 Important!

                // ////////////////////
                // Optional Fields:
                "files": [
                    "src/*.*"
                ],
                // Whether to ignore types of events
                "ignoreCreateEvents": false,
                "ignoreChangeEvents": false,
                "ignoreDeleteEvents": false,
                // Whether to ignore folder level events
                "onlyFiles": false,
                // The time to wait in milliseconds
                // before running the task after any file
                // system change is triggered
                "pauseMsBeforeRun": 100,
            },
            // 👇 This is the same task that triggers your target task
            // But simplified with default values
            {
                "label": "entr: echo (simple)",
                "type": "entr",
                "targetTask": "echo"
            }
        ]
    }
    ```
1. Modify any file in your workspace. You should see the `echo` task being re-triggered.

## Known Issues

There is a known issue where modifying any files under `.vscode` folder triggers your task 3 times. This is a known issue and is being worked on.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
