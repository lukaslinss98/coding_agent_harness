import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "../src/agent.ts";
import { client } from "../src/client.ts";
import { config } from "../src/config.ts";
import type { EvalTask } from "./types.ts";
import { createAndWriteFile } from "./tasks/createAndWriteFile.ts";

const tasks: EvalTask[] = [createAndWriteFile];

for (const task of tasks) {
  console.log(`running task: ${task.name}`);
  const dir = await mkdtemp(join(tmpdir(), "eval-"));

  try {
    const agent = new Agent(
      client,
      config.defaultModel,
      config.maxStepsDefault,
      (s) => console.log(s),
      dir,
    );
    const { toolCallCount } = await agent.callModel(task.prompt);
    console.log(`agent finished after ${toolCallCount} tool calls`)

    const passed = await task.check(dir);
    console.log(`${passed ? "PASS" : "FAIL"} ${task.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL ${task.name}: ${message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
