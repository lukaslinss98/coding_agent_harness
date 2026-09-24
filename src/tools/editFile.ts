import z from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { resolvePathArgs } from "./toolArgs.ts";

const editFileSchema = z.object({
  path: z.string(),
  oldString: z.string().min(1),
  newString: z.string(),
  replaceAll: z.boolean().default(false),
});

export async function editFile(args: unknown, root: string): Promise<string> {
  const resolved = resolvePathArgs(editFileSchema, args, root);

  if (!resolved.ok) {
    return resolved.error;
  }

  const { path, oldString, newString, replaceAll } = resolved.data;

  try {
    const original = await readFile(resolved.filePath, "utf-8");
    const matches = original.split(oldString).length - 1;

    if (matches === 0) {
      return (
        `Error: oldString not found in ${path}. ` +
        `Read the file again and copy the text exactly.`
      );
    }

    if (matches > 1 && !replaceAll) {
      return (
        `Error: oldString appears ${matches} times in ${path}. ` +
        `Add surrounding lines so it matches exactly once, or set replaceAll to true.`
      );
    }

    const updated = replaceAll
      ? original.split(oldString).join(newString)
      : replaceOnce(original, oldString, newString);

    await writeFile(resolved.filePath, updated, "utf-8");

    return `Edited ${path}: replaced ${matches} occurrence(s).`;
  } catch (err) {
    return `Error while invoking tool, edit_file: ${err}`;
  }
}

function replaceOnce(
  text: string,
  oldString: string,
  newString: string,
): string {
  const start = text.indexOf(oldString);
  return (
    text.slice(0, start) + newString + text.slice(start + oldString.length)
  );
}
