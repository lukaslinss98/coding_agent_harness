import { resolve } from "node:path";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.js";
import z from "zod";
import { parseReactReply as parseReActReply } from "./react.ts";
import { tools, toolsDescription } from "./tools/tools.ts";

type AgentResponse = {
  content: string;
  toolCallCount: number;
};

const replySchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
      }),
    )
    .min(1),
});

function extractReplyText(response: unknown): string {
  const parsed = replySchema.safeParse(response);

  if (!parsed.success) {
    throw new Error(`Unexpected model response: ${JSON.stringify(response)}`);
  }

  const content = parsed.data.choices[0]?.message.content;
  if (content === null || content === undefined) {
    throw new Error("Model returned no content");
  }

  return content;
}

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
    systemPrompt: string,
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
        content: systemPrompt,
      },
    ];
  }

  async callModel(input: string): Promise<AgentResponse> {
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

      const text = extractReplyText(response);

      this.messages.push({
        role: "assistant",
        content: text,
      });

      const reply = parseReActReply(text);

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
