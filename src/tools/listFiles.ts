import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import z from "zod";
import { resolvePathArgs } from "./toolArgs.ts";

const IGNORED_FILES = new Set(["node_modules", ".git"]);
const listFilesScheme = z.object({
  path: z.string(),
});

export async function listFiles(args: unknown, root: string) {
  const resolved = resolvePathArgs(listFilesScheme, args, root);

  if (!resolved.ok) {
    return resolved.error;
  }

  try {
    const contents = await readdir(resolved.filePath, { withFileTypes: true });

    return contents.filter(useEntry).map(mapEntry).join("\n");
  } catch (err) {
    return `Error while exectuing list_files tool: ${err}`;
  }
}

function mapEntry(entry: Dirent<string>): string {
  return entry.isDirectory() ? `${entry.name}/` : entry.name;
}

function useEntry(entry: Dirent<string>): boolean {
  return !IGNORED_FILES.has(entry.name);
}
