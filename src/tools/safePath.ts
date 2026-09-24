import { isAbsolute, relative, resolve } from "node:path";

export function safePath(input: string, root: string): string | null {
  const full = resolve(root, input);
  const rel = relative(root, full);

  if (rel === "") {
    return full;
  }
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return null;
  }
  return full;
}
