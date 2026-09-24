import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "../src/agent.ts";
import { client } from "../src/client.ts";
import { config } from "../src/config.ts";
import type { EvalTask, TaskResult } from "./types.ts";
import { createAndWriteFile } from "./tasks/createAndWriteFile/task.ts";
import { fixFunctionInNamedFile } from "./tasks/fixFunctionInNamedFile/task.ts";

const tasks: EvalTask[] = [createAndWriteFile, fixFunctionInNamedFile];

async function runTask(task: EvalTask): Promise<TaskResult> {
  const dir = await mkdtemp(join(tmpdir(), "eval-"));

  await task.setup?.(dir);

  try {
    const agent = new Agent(
      client,
      config.defaultModel,
      config.maxStepsDefault,
      console.log,
      dir,
    );
    const { toolCallCount } = await agent.callModel(task.prompt);
    const passed = await task.check(dir);
    return { name: task.name, passed, toolCallCount };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { name: task.name, passed: false, toolCallCount: 0, error };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function printResult(result: TaskResult): void {
  if (result.error !== undefined) {
    console.log(`FAIL ${result.name}: ${result.error}`);
    return;
  }

  const status = result.passed ? "PASS" : "FAIL";
  console.log(`${status} ${result.name} (${result.toolCallCount} tool calls)`);
}

function printSummary(results: TaskResult[]): void {
  const passed = results.filter((r) => r.passed).length;
  const percent = Math.round((passed / results.length) * 100);

  const finished = results.filter((r) => r.error === undefined);
  const totalToolCalls = finished.reduce((sum, r) => sum + r.toolCallCount, 0);
  const avgToolCalls =
    finished.length === 0 ? 0 : totalToolCalls / finished.length;

  console.log("\nSummary");
  console.log(`  passed:          ${passed}/${results.length} (${percent}%)`);
  console.log(`  avg tool calls:  ${avgToolCalls.toFixed(1)}`);
}

console.log(
  `Evaluating ${tasks.length} task${tasks.length === 1 ? "" : "s"}...\n`,
);

const results: TaskResult[] = [];

for (const task of tasks) {
  console.log(`running task: ${task.name}`);
  const result = await runTask(task);
  printResult(result);
  results.push(result);
}

printSummary(results);
