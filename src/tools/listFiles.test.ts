import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listFiles } from "./listFiles.ts";
import { makeTempDirInsideProject } from "./testTempDir.ts";

let dir: string;

before(async () => {
  dir = await makeTempDirInsideProject("tmp-listfiles-test-");
  await writeFile(join(dir, "main.ts"), "", "utf-8");
  await mkdir(join(dir, "tools"));
  await mkdir(join(dir, "node_modules"));
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("lists files and marks directories with a slash", async () => {
  const result = await listFiles({ path: "." }, dir);
  const names = result.split("\n").sort();

  assert.deepEqual(names, ["main.ts", "tools/"]);
});

test("returns an error message when the path is not a string", async () => {
  const result = await listFiles({ path: 5 }, dir);

  assert.match(result, /expected string/);
});

test("returns an error message when the directory does not exist", async () => {
  const result = await listFiles({ path: "missing" }, dir);

  assert.match(result, /list_files/);
});

test("refuses a path outside the project directory", async () => {
  const result = await listFiles({ path: "../.." }, dir);

  assert.match(result, /outside the project directory/);
});
