import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "../src/agent.ts";
import { client } from "../src/client.ts";
import { config } from "../src/config.ts";
import type { EvalTask, TaskResult } from "./types.ts";
import { createAndWriteFile } from "./tasks/createAndWriteFile/task.ts";
import { fixFunctionInNamedFile } from "./tasks/fixFunctionInNamedFile/task.ts";
import { fixFunctionInUnknownFile } from "./tasks/fixFunctionInUnknownFile/task.ts";
import { parseArgs } from "node:util";
import { buildSystemPrompt } from "../src/systemPrompt.ts";

const tasks: EvalTask[] = [
  createAndWriteFile,
  fixFunctionInNamedFile,
  fixFunctionInUnknownFile,
];

async function runTask(
  task: EvalTask,
  model: string,
  debug: boolean,
): Promise<TaskResult> {
  const dir = await mkdtemp(join(tmpdir(), "eval-"));

  await task.setup?.(dir);

  try {
    const { prompt } = await buildSystemPrompt(dir);
    const agent = new Agent(
      client,
      model,
      prompt,
      config.maxStepsDefault,
      debug ? console.log : () => {},
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

function readCliArgs() {
  return parseArgs({
    options: {
      debug: { type: "boolean", default: false },
      model: { type: "string", default: config.defaultModel },
      task: { type: "string" },
    },
  }).values;
}

async function runTasks(selected: EvalTask[], model: string, debug: boolean) {
  console.log(
    `Evaluating ${selected.length} task${selected.length === 1 ? "" : "s"}...\nModel: ${model}\n`,
  );

  const results: TaskResult[] = [];

  for (const task of selected) {
    console.log(`running task: ${task.name}`);
    const result = await runTask(task, model, debug);
    printResult(result);
    results.push(result);
  }

  printSummary(results);
}

const { debug, model, task } = readCliArgs();

const selectedTasks =
  task === undefined ? tasks : tasks.filter((t) => t.name === task);

if (selectedTasks.length === 0) {
  console.error(`Unknown task: ${task}`);
  console.error(`Available: ${tasks.map((t) => t.name).join(", ")}`);
  process.exitCode = 1;
} else {
  await runTasks(selectedTasks, model, debug);
}
