import z from "zod";
import { safePath } from "./safePath.ts";

type Resolved<T> =
  { ok: true; data: T; filePath: string } | { ok: false; error: string };

export function resolvePathArgs<T extends { path: string }>(
  schema: z.ZodType<T>,
  args: unknown,
  root: string,
): Resolved<T> {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const filePath = safePath(parsed.data.path, root);

  if (filePath === null) {
    return {
      ok: false,
      error: `Refused: ${parsed.data.path} is outside the project directory.`,
    };
  }

  return { ok: true, data: parsed.data, filePath };
}
