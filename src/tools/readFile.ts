import z from "zod";
import { readFile } from "node:fs/promises";
import { resolvePathArgs } from "./toolArgs.ts";

const readFileScheme = z.object({
  path: z.string(),
});

export async function readFileTool(
  args: unknown,
  root: string,
): Promise<string> {
  const resolved = resolvePathArgs(readFileScheme, args, root);

  if (!resolved.ok) {
    return resolved.error;
  }

  try {
    return await readFile(resolved.filePath, "utf-8");
  } catch (err) {
    return `Could not read ${resolved.data.path}: ${err}`;
  }
}
