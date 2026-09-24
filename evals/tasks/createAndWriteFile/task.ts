import { readFile } from "node:fs/promises";
import { join } from "path";
import type { EvalTask } from "../../types.ts";

const fileName = "hello.txt";
const fileContent = "hello";

async function checkCreateFileWithContent(
  dir: string,
  expectedFile: string,
  expectedContent: string,
): Promise<boolean> {
  try {
    const content = await readFile(join(dir, expectedFile), "utf-8");
    return expectedContent.trim() === content;
  } catch {
    return false;
  }
}

export const createAndWriteFile: EvalTask = {
  name: "create-and-write-file",
  prompt: `Create ${fileName} containing exactly ${fileContent}`,
  check: async (dir) => checkCreateFileWithContent(dir, fileName, fileContent),
};
