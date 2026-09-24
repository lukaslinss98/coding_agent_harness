import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toolsDescription } from "./tools/tools.ts";

export const INSTRUCTION_FILE_NAMES = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"];

type ProjectInstructions = {
  fileName: string;
  instructions: string;
};

async function readFileIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return undefined;
    }
    throw err;
  }
}

async function readProjectInstructions(
  root: string,
): Promise<ProjectInstructions | undefined> {
  for (const fileName of INSTRUCTION_FILE_NAMES) {
    const instructions = await readFileIfExists(join(root, fileName));
    if (instructions !== undefined && instructions.trim() !== "") {
      return { fileName, instructions };
    }
  }
  return undefined;
}

export type SystemPrompt = {
  prompt: string;
  instructionsFileName: string | undefined;
};

export async function buildSystemPrompt(root: string): Promise<SystemPrompt> {
  const projectInstructions = await readProjectInstructions(root);

  const userInstructions = projectInstructions
    ? `<project-instructions>${projectInstructions.instructions}</project-instructions>`
    : "";

  const prompt = `
You are an expert coding assistant operating inside a coding harness and working in this project. The project root is ".".
To interact with the project, you have access to these tools:

${toolsDescription}

General tool rules:
- Explore with list_files and read_file before you change anything.
- Read a file before you change it with edit_file or write_file.
- To change an existing file, use edit_file. Use write_file only for new files or full rewrites.
- One tool call per reply. Never write "Observation:" yourself.

To use a tool, reply in exactly this format:

Thought: <why you need this step>
Action: <tool name>
Action Input: <single-line JSON>

Rules for Action Input:
- Valid JSON only.
- No markdown fence. No extra text after it.

Example:

Thought: I need to see the project layout first.
Action: list_files
Action Input: {"path": "."}

Stop after Action Input. I will reply with the result:

Observation: <the result of the tool - I write this line, never you>

Then continue with another Thought, or finish with:

Final Answer: <answer>

${userInstructions}
`;

  return { prompt, instructionsFileName: projectInstructions?.fileName };
}
