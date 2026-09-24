import { cp } from "node:fs/promises";
import { join } from "node:path";
import type { EvalTask } from "../../types.ts";

const fixtureDir = join(import.meta.dirname, "fixture");

async function copyFixture(dir: string): Promise<void> {
  await cp(fixtureDir, dir, { recursive: true });
}

async function checkCartTotalIsFixed(dir: string): Promise<boolean> {
  const { total } = await import(join(dir, "src/cart.js"));
  const items = [
    { price: 3, quantity: 2 },
    { price: 7, quantity: 1 },
  ];
  return total(items) === 13;
}

export const fixFunctionInUnknownFile: EvalTask = {
  name: "fix-function-in-unknown-file",
  prompt:
    "The cart total is wrong. A cart with items priced 10, 10 and 5 shows 15 instead of 25. Find and fix the bug.",
  check: checkCartTotalIsFixed,
  setup: copyFixture,
};
