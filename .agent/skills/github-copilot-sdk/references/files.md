# Working with Files

The GitHub Copilot SDK allows the agent to interact with the file system directly. By default, the SDK enables all standard Copilot tools, including file reading and writing.

## Reading Files

The agent can read files to understand the codebase.

```python
await session.send_and_wait({
    "prompt": "Read the content of 'setup.py' and explain what dependencies are required."
})
```

## Writing and Editing Files

The agent can create or modify files.

```python
await session.send_and_wait({
    "prompt": "Create a new file named 'utils.py' with a function that calculates the fibonacci sequence."
})
```

```python
await session.send_and_wait({
    "prompt": "Update 'README.md' to include a section about installation."
})
```

## Workspace Context

To ensure the agent operates in the correct directory, launch the Copilot CLI with the correct working directory, or ensure your `CopilotClient` connects to a CLI instance running in the desired root.

If you are just using `CopilotClient()` it spins up a managed CLI process. You can control the working directory by passing arguments or ensuring the python script is run from the root of the project, as the CLI handles relative paths.

**Note:** File operations are subject to the permissions of the user running the process.
