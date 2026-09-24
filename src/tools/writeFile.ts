import z from "zod";
import { writeFile } from "node:fs/promises";
import { resolvePathArgs } from "./toolArgs.ts";

const writeToFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export async function writeToFile(
  args: unknown,
  root: string,
): Promise<string> {
  const resolved = resolvePathArgs(writeToFileSchema, args, root);

  if (!resolved.ok) {
    return resolved.error;
  }

  const content = resolved.data.content;

  try {
    await writeFile(resolved.filePath, content, "utf-8");
  } catch (err) {
    return `Error while invoking tool, write_file: ${err}`;
  }

  const bytes = Buffer.byteLength(content, "utf-8");

  return `Wrote ${bytes} to ${resolved.data.path}`;
}
