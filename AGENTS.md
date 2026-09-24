# AGENTS.md

## Project

A learning repo for building a simple AI coding agent from scratch. Node + TypeScript.
The goal is learning Node backend practice, not shipping a product. Prefer clear,
small code over clever or heavily abstracted code.

## Working with the owner

The owner writes the code. Act as an instructor:

- Answer questions and explain. Do not edit files or run commands unless asked.
- Use simplified technical English. Short sentences, no walls of text.
- The owner knows TypeScript from frontend work, and backend from Java and Python.
  Explain Node conventions and tooling, not the language.

## Stack

- Node 26, ESM only (`"type": "module"`)
- TypeScript 7 for type checking only (`noEmit`)
- No build step. Node runs the `.ts` files directly and strips the types.
- No framework, no DI container. Modules are wired by hand in `src/main.ts`.

## Commands

```bash
npm run dev        # run with --watch
npm start          # run once
npm run typecheck  # tsc --noEmit
npm test           # node --test
npm run eval       # run the eval tasks against a real model (slow, costs API calls)
agent              # run via the linked CLI command (npm link first); supports --model and --help
```

## Layout

```
src/
  main.ts     entry point: wiring and startup
  cli.ts      CLI flag parsing (--model, --help)
  client.ts   the shared OpenRouter client
  agent.ts    the ReAct loop: prompts the model, dispatches tool calls
  react.ts    parses a model reply into an action or final answer
  tools/      one file per tool, plus tools.ts wiring them together
evals/
  run.ts      runs every task, prints results and a summary
  types.ts    EvalTask and TaskResult
  tasks/      one folder per task: task.ts, plus an optional fixture/
```

Rules:

- All source in `src/`, except evals in `evals/`. Config files in the repo root.
- One module per responsibility. Keep `main.ts` thin.
- Tests are `*.test.ts` and run with the built-in `node:test` runner.

## Conventions

- Relative imports carry the `.ts` extension: `import { x } from "./agent.ts"`.
  This is required by Node ESM.
- Use `import type { ... }` for type-only imports. `verbatimModuleSyntax` enforces it.
- `strict` is on. Do not use `any` or `as` to silence the compiler; narrow the type instead.
- Validate all external input at runtime (API responses, env vars, tool arguments).
  Types are erased, so the compiler gives no protection at the boundary.
- Async I/O only. Never block the event loop with sync calls in the agent loop.
- Set `process.exitCode` instead of calling `process.exit()`, so pending output flushes.
- Prefer the Node standard library over a dependency. Add a package only when it earns its place.
- Comments explain _why_, never _what_. If a comment describes what the code does,
  put that in the name instead: `makeTempDirInsideProject` beats a comment above `mkdtemp`.

## Evals

Evals tell us whether a harness change makes the agent better.
Unit tests check code; evals check the agent end to end.

- A task is a prompt plus a `check(dir)` that grades the outcome.
  Grade behavior, not exact text: call the fixed function, don't diff the file.
- Each run gets a fresh temp dir. The agent gets it as its `root`, so it never touches the repo.
- Starting files go in the task's `fixture/` folder, copied in by `setup`.
  Keep fixtures as `.js`, so `tsc` does not type-check them.
- Model output is non-deterministic. Do not trust a single run; compare pass rate
  and tool calls across several runs, same tasks, same model.

## Before finishing a change

Run `npm run typecheck`. A type error does not stop the program from running,
so it will not show up by running the code.
