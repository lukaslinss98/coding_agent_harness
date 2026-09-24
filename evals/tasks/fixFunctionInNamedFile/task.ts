import { cp } from "node:fs/promises";
import { join } from "node:path";
import type { EvalTask } from "../../types.ts";

const fileName = "add.js";
const functionName = "add";

const fixtureDir = join(import.meta.dirname, "fixture");

async function copyFixture(dir: string): Promise<void> {
  await cp(fixtureDir, dir, { recursive: true });
}

async function checkAddIsFixed(dir: string): Promise<boolean> {
  const { add } = await import(join(dir, fileName));
  return add(2, 3) === 5;
}

export const fixFunctionInNamedFile: EvalTask = {
  name: "fix-function-in-named-file",
  prompt: `The ${functionName} function in ${fileName} has a bug. Fix it`,
  check: checkAddIsFixed,
  setup: copyFixture,
};
