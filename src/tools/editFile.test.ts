import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { editFile } from "./editFile.ts";
import { makeTempDirInsideProject } from "./testTempDir.ts";

let dir: string;

before(async () => {
  dir = await makeTempDirInsideProject("tmp-editfile-test-");
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

function toolPath(name: string): string {
  return relative(process.cwd(), join(dir, name));
}

async function makeFile(name: string, content: string): Promise<void> {
  await writeFile(join(dir, name), content, "utf-8");
}

async function readBack(name: string): Promise<string> {
  return readFile(join(dir, name), "utf-8");
}

test("replaces a single match", async () => {
  await makeFile("one.txt", "let x = 1;\nlet y = 2;\n");

  const result = await editFile({
    path: toolPath("one.txt"),
    oldString: "let y = 2;",
    newString: "let y = 3;",
  });

  assert.equal(await readBack("one.txt"), "let x = 1;\nlet y = 3;\n");
  assert.match(result, /Edited/);
});

test("returns an error and leaves the file unchanged when there is no match", async () => {
  await makeFile("none.txt", "hello");

  const result = await editFile({
    path: toolPath("none.txt"),
    oldString: "goodbye",
    newString: "x",
  });

  assert.match(result, /not found/);
  assert.equal(await readBack("none.txt"), "hello");
});

test("returns an error and leaves the file unchanged when there are several matches", async () => {
  await makeFile("many.txt", "a = 1;\nb = 1;\n");

  const result = await editFile({
    path: toolPath("many.txt"),
    oldString: "= 1;",
    newString: "= 2;",
  });

  assert.match(result, /appears 2 times/);
  assert.equal(await readBack("many.txt"), "a = 1;\nb = 1;\n");
});

test("replaces every match when replaceAll is true", async () => {
  await makeFile("all.txt", "a = 1;\nb = 1;\n");

  await editFile({
    path: toolPath("all.txt"),
    oldString: "= 1;",
    newString: "= 2;",
    replaceAll: true,
  });

  assert.equal(await readBack("all.txt"), "a = 2;\nb = 2;\n");
});

test("inserts dollar patterns in newString literally", async () => {
  await makeFile("dollar.txt", "old");

  await editFile({
    path: toolPath("dollar.txt"),
    oldString: "old",
    newString: "`${a}$&$$`",
  });

  assert.equal(await readBack("dollar.txt"), "`${a}$&$$`");
});

test("rejects an empty oldString", async () => {
  await makeFile("empty.txt", "abc");

  const result = await editFile({
    path: toolPath("empty.txt"),
    oldString: "",
    newString: "x",
  });

  assert.equal(await readBack("empty.txt"), "abc");
  assert.doesNotMatch(result, /Edited/);
});

test("refuses a path outside the project directory", async () => {
  const result = await editFile({
    path: "../escaped.txt",
    oldString: "a",
    newString: "b",
  });

  assert.match(result, /outside the project directory/);
});

test("returns an error message when the file does not exist", async () => {
  const result = await editFile({
    path: toolPath("missing.txt"),
    oldString: "a",
    newString: "b",
  });

  assert.match(result, /Error while invoking tool/);
});
