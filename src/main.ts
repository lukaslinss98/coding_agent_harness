#!/usr/bin/env node

import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import { Agent } from "./agent.ts";
import { cliArguments, helpText } from "./cli.ts";
import { client } from "./client.ts";
import { buildSystemPrompt, INSTRUCTION_FILE_NAMES } from "./systemPrompt.ts";

async function runRepl(agent: Agent) {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  rl.setPrompt("> ");
  rl.prompt();

  for await (const input of rl) {
    if (input === "exit") {
      console.log("Agent exiting");
      break;
    }

    try {
      const response = await agent.callModel(input);
      console.log(response.content);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
    }

    rl.prompt();
  }

  rl.close();
}

async function main() {
  const { model, help, maxSteps } = cliArguments();

  if (help) {
    console.log(helpText());
    return;
  }

  console.log(`harness started with model: ${model}`);

  const root = process.cwd();
  const { prompt, instructionsFileName } = await buildSystemPrompt(root);

  console.log(
    instructionsFileName
      ? `project instructions loaded from ${instructionsFileName}`
      : `no project instructions found (looked for ${INSTRUCTION_FILE_NAMES.join(", ")})`,
  );

  const agent = new Agent(
    client,
    model,
    prompt,
    maxSteps,
    (s: string) => console.log(s),
    root,
  );

  await runRepl(agent);
}

main().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error(errorMessage);
  process.exitCode = 1;
});
