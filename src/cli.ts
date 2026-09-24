import { parseArgs } from "node:util";
import { config } from "./config.ts";

const options = {
  model: {
    type: "string",
    default: config.defaultModel,
    description: "Model to use",
  },
  "max-steps": {
    type: "string",
    default: String(config.maxStepsDefault),
    description: "Maximum number of steps the agent can take",
  },
  help: {
    type: "boolean",
    short: "h",
    default: false,
    description: "Show this help message",
  },
} as const;

export function cliArguments() {
  const args = parseArgs({ options });
  const maxSteps = Number(args.values["max-steps"]);

  return {
    ...args.values,
    maxSteps,
  };
}

export function helpText() {
  const lines = Object.entries(options).map(([name, opt]) => {
    const flag = "short" in opt ? `-${opt.short}, --${name}` : `--${name}`;
    return `  ${flag.padEnd(16)} ${opt.description}`;
  });

  return `Usage: agent [options]\n\nOptions:\n${lines.join("\n")}`;
}
