# coding_agent

A simple AI coding agent, built from scratch to learn more about agentic coding

## Requirements

- Node 26+ (runs TypeScript directly, no build step)
- An OpenRouter API key exported as `OPENROUTER_API_KEY`

## Setup

```bash
npm install
```

## Usage

```bash
npm run dev        # run with auto-restart
npm start          # run once
npm run typecheck  # check types
npm test           # run tests
npm run eval       # run the evals (calls a real model)
```

Type a message at the `>` prompt. Type `exit` to quit.

### Run as a CLI command

The project also installs as an `agent` command, so you can run it from any
directory without `npm start`:

```bash
npm link   # once, or again after changing the "bin" field in package.json
agent
```

`npm link` symlinks the `agent` command to `src/main.ts`, so code changes take
effect immediately — no relinking needed unless you edit `package.json`'s
`name` or `bin` fields.

Flags:

| Flag              | Default           | What it does                                   |
| ----------------- | ----------------- | ---------------------------------------------- |
| `--model <name>`  | `openrouter/free` | Sets the model the agent calls.                |
| `--max-steps <n>` | `30`              | Stops the agent after this many model replies. |
| `-h`, `--help`    |                   | Prints usage and exits.                        |

## Tools

The agent works in a ReAct loop: it reasons, calls one tool, reads the result,
and repeats until it can answer.

| Tool         | Arguments                                                                            | What it does                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `read_file`  | `{"path": string}`                                                                   | Returns the contents of one text file.                                                                               |
| `list_files` | `{"path": string}`                                                                   | Lists the names in one directory. Not recursive; `node_modules` and `.git` are hidden. Directories end with a slash. |
| `write_file` | `{"path": string, "content": string}`                                                | Writes text to a file, creating it if needed. Overwrites the whole file.                                             |
| `edit_file`  | `{"path": string, "oldString": string, "newString": string, "replaceAll"?: boolean}` | Replaces text in an existing file. `oldString` must match exactly once, unless `replaceAll` is true.                 |

All paths are relative to the directory the agent runs in. Paths that resolve
outside it are refused, so the agent cannot read or write anywhere else on the
machine.

Tools never throw. A failure comes back as text, which the model reads and
retries.

## Evals

Evals check whether a harness change makes the agent better. Each task gives
the agent a prompt in a fresh temp directory, then grades the result with code.

```bash
npm run eval
```

```
PASS create-and-write-file (1 tool calls)
PASS fix-function-in-named-file (2 tool calls)

Summary
  passed:          2/2 (100%)
  avg tool calls:  1.5
```

To add a task, create `evals/tasks/<name>/task.ts` exporting an `EvalTask`
(`name`, `prompt`, `check`, optional `setup`), and add it to the list in
`evals/run.ts`. Put starting files in a `fixture/` folder next to it.

Model output varies between runs, so compare several runs before trusting a
difference.
