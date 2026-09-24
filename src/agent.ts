import { resolve } from "node:path";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.js";
import { parseReactReply as parseReActReply } from "./react.ts";
import { tools, toolsDescription } from "./tools/tools.ts";

type ModelResponse = {
  content: string;
  toolCallCount: number;
};

const SYSTEM_PROMPT = `
You are a coding assistant working in a project. Project root is ".".
You have access to these tools:

${toolsDescription}

General tool rules:
- Explore with list_files and read_file before you change anything.
- Read a file before you overwrite it with write_file.
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
`;

export class Agent {
  private client: OpenAI;
  private model: string;
  private messages: ChatCompletionMessageParam[];
  private onStep: (s: string) => void;
  private maxSteps: number;
  private root: string;

  constructor(
    client: OpenAI,
    model: string,
    maxSteps: number,
    onStep: (s: string) => void,
    root: string,
  ) {
    this.client = client;
    this.model = model;
    this.onStep = onStep;
    this.maxSteps = maxSteps;
    this.root = resolve(root);
    this.messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
    ];
  }

  async callModel(input: string): Promise<ModelResponse> {
    this.messages.push({
      role: "user",
      content: input,
    });

    let toolCallCount = 0;
    for (let step = 0; step < this.maxSteps; step++) {
      const response = await this.client.chat.completions.create({
        messages: this.messages,
        model: this.model,
      });

      const choice = response.choices[0];
      if (choice === undefined || choice.message.content === null) {
        throw new Error("model did not return response");
      }

      this.messages.push({
        role: "assistant",
        content: choice.message.content,
      });

      const reply = parseReActReply(choice.message.content);

      switch (reply.kind) {
        case "final":
          return { content: reply.answer, toolCallCount: toolCallCount };
        case "action": {
          this.onStep(
            `Thought: ${reply.thought}\nCalling tool ${reply.tool} - ${reply.input}`,
          );
          const result = await this.executeTool(reply.tool, reply.input);
          toolCallCount++;
          this.messages.push({
            role: "user",
            content: `Observation: ${result}`,
          });
          break;
        }
        case "error":
          this.messages.push({ role: "user", content: reply.message });
          break;
      }
    }

    return {
      content: `model did not arrive at final answer after ${this.maxSteps} maximum steps`,
      toolCallCount: toolCallCount,
    };
  }

  async executeTool(toolName: string, input: string): Promise<string> {
    let args: unknown;

    try {
      args = JSON.parse(input);
    } catch (err) {
      return `Could not parse input args for tool. Threw error ${err}`;
    }

    const tool = tools[toolName];

    if (tool === undefined) {
      return `Unknown tool ${toolName}. Available tools ${toolsDescription}`;
    }

    return tool.function(args, this.root);
  }
}
